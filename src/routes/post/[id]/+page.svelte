<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/button.svelte';
	import Textarea from '$lib/components/ui/textarea.svelte';
	import { ArrowBigDown, ArrowBigUp, Sparkles } from 'lucide-svelte';
	import { hostname, timeAgo } from '$lib/utils';
	import type { Comment } from '$lib/server/db';

	let { data } = $props();
	let summarizing = $state(false);
	let summary = $derived(data.post.ai_summary);

	async function generateSummary() {
		summarizing = true;
		try {
			const res = await fetch('/api/ai/summarize', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ postId: data.post.id })
			});
			if (res.ok) {
				const j = await res.json();
				summary = j.summary;
			}
		} finally {
			summarizing = false;
		}
	}

	type CommentNode = Comment & { children: CommentNode[] };

	let tree = $derived.by<CommentNode[]>(() => {
		const map = new Map<number, CommentNode>();
		for (const c of data.comments) map.set(c.id, { ...c, children: [] });
		const roots: CommentNode[] = [];
		for (const node of map.values()) {
			if (node.parent_id && map.has(node.parent_id)) {
				map.get(node.parent_id)!.children.push(node);
			} else {
				roots.push(node);
			}
		}
		return roots;
	});

	let replyTo = $state<number | null>(null);
</script>

<div class="mx-auto max-w-3xl px-4 py-6">
	<article class="rounded-lg border bg-card p-4">
		<div class="flex gap-3">
			<div class="flex flex-col items-center w-10 text-muted-foreground select-none">
				<form method="POST" action="?/vote" use:enhance>
					<input type="hidden" name="kind" value="post" />
					<input type="hidden" name="id" value={data.post.id} />
					<input
						type="hidden"
						name="value"
						value={data.post.user_vote === 1 ? 0 : 1}
					/>
					<button
						type="submit"
						class="p-1 rounded hover:bg-accent {data.post.user_vote === 1
							? 'text-primary'
							: ''}"
						aria-label="Upvote"
					>
						<ArrowBigUp class="h-5 w-5" />
					</button>
				</form>
				<span class="text-sm font-semibold tabular-nums">{data.post.score}</span>
			</div>
			<div class="flex-1 min-w-0">
				<h1 class="text-xl font-semibold leading-tight">
					{#if data.post.url}
						<a
							href={data.post.url}
							target="_blank"
							rel="noopener noreferrer"
							class="hover:underline"
						>
							{data.post.title}
						</a>
						<span class="text-xs text-muted-foreground font-normal">
							({hostname(data.post.url)})
						</span>
					{:else}
						{data.post.title}
					{/if}
				</h1>
				<div class="text-xs text-muted-foreground mt-1">
					by <span class="text-foreground">{data.post.username}</span> ·
					{timeAgo(data.post.created_at)}
				</div>
				{#if data.post.body}
					<div class="prose prose-sm max-w-none mt-3 whitespace-pre-wrap">
						{data.post.body}
					</div>
				{/if}

				<div class="mt-4 rounded-md border bg-muted/40 p-3">
					<div class="flex items-center justify-between gap-2 mb-1">
						<div class="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
							<Sparkles class="h-3.5 w-3.5" /> AI summary
						</div>
						<Button
							type="button"
							size="sm"
							variant="ghost"
							onclick={generateSummary}
							disabled={summarizing}
						>
							{summarizing ? 'Summarising…' : summary ? 'Regenerate' : 'Generate'}
						</Button>
					</div>
					{#if summary}
						<p class="text-sm">{summary}</p>
					{:else}
						<p class="text-sm text-muted-foreground italic">
							No summary yet. Click "Generate" to create one.
						</p>
					{/if}
				</div>
			</div>
		</div>
	</article>

	<section class="mt-6">
		<h2 class="text-lg font-semibold mb-3">
			{data.post.comment_count} comment{data.post.comment_count === 1 ? '' : 's'}
		</h2>

		{#if data.user}
			<form method="POST" action="?/comment" use:enhance class="mb-6 space-y-2">
				<Textarea name="body" placeholder="Add to the discussion…" required />
				<div class="flex justify-end">
					<Button type="submit" size="sm">Post comment</Button>
				</div>
			</form>
		{:else}
			<p class="text-sm text-muted-foreground mb-6">
				<a href="/login" class="underline">Log in</a> to join the discussion.
			</p>
		{/if}

		{#if tree.length === 0}
			<p class="text-sm text-muted-foreground">No comments yet.</p>
		{:else}
			{#snippet renderComment(c: CommentNode, depth: number)}
				<div class="border-l pl-3" style="margin-left: {depth * 12}px">
					<div class="flex items-baseline gap-2 text-xs text-muted-foreground">
						<span class="text-foreground font-medium">{c.username}</span>
						<span>·</span>
						<span class="tabular-nums">{c.score}</span>
						<span>·</span>
						<span>{timeAgo(c.created_at)}</span>
					</div>
					<p class="text-sm mt-1 whitespace-pre-wrap">{c.body}</p>
					<div class="flex items-center gap-2 mt-1 text-xs">
						<form method="POST" action="?/vote" use:enhance>
							<input type="hidden" name="kind" value="comment" />
							<input type="hidden" name="id" value={c.id} />
							<input
								type="hidden"
								name="value"
								value={c.user_vote === 1 ? 0 : 1}
							/>
							<button
								type="submit"
								class="text-muted-foreground hover:text-primary {c.user_vote === 1
									? 'text-primary'
									: ''}"
								aria-label="Upvote comment"
							>
								<ArrowBigUp class="h-4 w-4 inline" /> upvote
							</button>
						</form>
						{#if data.user}
							<button
								type="button"
								class="text-muted-foreground hover:text-foreground"
								onclick={() => (replyTo = replyTo === c.id ? null : c.id)}
							>
								reply
							</button>
						{/if}
					</div>

					{#if replyTo === c.id && data.user}
						<form
							method="POST"
							action="?/comment"
							use:enhance={() => {
								return async ({ update }) => {
									await update();
									replyTo = null;
								};
							}}
							class="mt-2 space-y-2"
						>
							<input type="hidden" name="parent_id" value={c.id} />
							<Textarea name="body" placeholder="Reply…" required />
							<div class="flex justify-end gap-2">
								<Button
									type="button"
									size="sm"
									variant="ghost"
									onclick={() => (replyTo = null)}
								>
									Cancel
								</Button>
								<Button type="submit" size="sm">Reply</Button>
							</div>
						</form>
					{/if}

					{#each c.children as child (child.id)}
						{@render renderComment(child, depth + 1)}
					{/each}
				</div>
			{/snippet}

			<div class="space-y-4">
				{#each tree as root (root.id)}
					{@render renderComment(root, 0)}
				{/each}
			</div>
		{/if}
	</section>
</div>
