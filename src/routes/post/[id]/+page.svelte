<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/button.svelte';
	import Textarea from '$lib/components/ui/textarea.svelte';
	import { ChevronUp, MessageSquare, RefreshCw, Send, Sparkles } from 'lucide-svelte';
	import { hostname, tagsOf, timeAgo } from '$lib/utils';
	import type { Comment } from '$lib/server/db';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { ActionData, PageData } from './$types';

	type CommentActionData = ActionData & {
		body?: string;
		parentId?: number | null;
		message?: string;
	};

	let { data, form }: { data: PageData; form: CommentActionData } = $props();
	let summarizing = $state(false);
	let initialSummary = $derived(data.post.ai_summary ?? '');
	let summary = $state('');
	let summaryError = $state('');
	const tags = $derived(tagsOf(data.post.tags));
	let commentSort = $state<'top' | 'new'>('top');
	let rootCommentBody = $state('');
	let replyBodies = $state<Record<number, string>>({});
	let rootCommentPending = $state(false);
	let replyPendingId = $state<number | null>(null);

	$effect(() => {
		summary = initialSummary;
	});

	$effect(() => {
		if (form?.body) {
			if (form.parentId) {
				replyBodies[form.parentId] = form.body;
				replyTo = form.parentId;
			} else {
				rootCommentBody = form.body;
			}
		}
	});

	async function generateSummary() {
		summarizing = true;
		summaryError = '';
		try {
			const res = await fetch('/api/ai/summarize', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ postId: data.post.id })
			});
			if (!res.ok) {
				summaryError = (await res.text()) || 'Summary unavailable right now.';
				return;
			}

			const reader = res.body?.getReader();
			if (!reader) {
				summaryError = 'Summary unavailable right now.';
				return;
			}

			const decoder = new TextDecoder();
			summary = '';
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				summary += decoder.decode(value, { stream: true });
			}
			summary += decoder.decode();
			summary = summary.trim();
			if (!summary) summaryError = 'Summary unavailable right now.';
		} catch {
			summaryError = 'Summary unavailable right now.';
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
		const bySelectedSort = (a: CommentNode, b: CommentNode) => {
			if (commentSort === 'new') return b.created_at - a.created_at;
			return b.score - a.score || a.created_at - b.created_at;
		};
		const sortBranch = (nodes: CommentNode[]) => {
			nodes.sort(bySelectedSort);
			for (const node of nodes) sortBranch(node.children);
		};
		sortBranch(roots);
		return roots;
	});

	let replyTo = $state<number | null>(null);

	const enhanceRootComment: SubmitFunction = () => {
		rootCommentPending = true;
		return async ({ result, update }) => {
			await update({ reset: result.type === 'success' });
			rootCommentPending = false;
			if (result.type === 'success') rootCommentBody = '';
		};
	};

	function enhanceReply(parentId: number): SubmitFunction {
		return () => {
			replyPendingId = parentId;
			return async ({ result, update }) => {
				await update({ reset: result.type === 'success' });
				replyPendingId = null;
				if (result.type === 'success') {
					replyBodies[parentId] = '';
					replyTo = null;
				}
			};
		};
	}

	function avatarColor(name: string): string {
		const colors = [
			'bg-rose-500/20 text-rose-300',
			'bg-amber-500/20 text-amber-300',
			'bg-emerald-500/20 text-emerald-300',
			'bg-sky-500/20 text-sky-300',
			'bg-violet-500/20 text-violet-300',
			'bg-fuchsia-500/20 text-fuchsia-300',
			'bg-primary/20 text-primary'
		];
		let h = 0;
		for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
		return colors[Math.abs(h) % colors.length];
	}
</script>

<div class="mx-auto max-w-3xl px-4 py-4 space-y-6">
	<article class="rounded-lg border bg-card p-4">
		<div class="flex gap-3">
			<div class="flex flex-col items-center w-10 shrink-0 select-none">
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
						class="p-1 rounded transition-colors {data.post.user_vote === 1
							? 'text-primary'
							: 'text-muted-foreground hover:text-primary'}"
						aria-label="Upvote"
					>
						<ChevronUp class="h-5 w-5" strokeWidth={2.4} />
					</button>
				</form>
				<span
					class="mt-0.5 text-sm font-semibold tabular-nums {data.post.user_vote === 1
						? 'text-primary'
						: 'text-foreground'}"
				>
					{data.post.score}
				</span>
			</div>

			<div class="flex-1 min-w-0">
				<h1 class="text-2xl font-bold leading-tight">
					{#if data.post.url}
						<a
							href={data.post.url}
							target="_blank"
							rel="noopener noreferrer"
							class="hover:text-primary transition-colors"
						>
							{data.post.title}
						</a>
					{:else}
						{data.post.title}
					{/if}
				</h1>

				{#if data.post.url}
					<div class="text-xs text-muted-foreground mt-1 truncate">
						<a href={data.post.url} target="_blank" rel="noopener noreferrer" class="hover:underline">
							{hostname(data.post.url)}
						</a>
					</div>
				{/if}

				{#if tags.length > 0}
					<div class="mt-3 flex flex-wrap gap-1.5">
						{#each tags as tag}
							<span class="inline-flex items-center rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
								#{tag}
							</span>
						{/each}
					</div>
				{/if}

				<div class="mt-2 text-xs text-muted-foreground">
					by <span class="text-foreground/90">{data.post.username}</span>
					· {timeAgo(data.post.created_at)}
					· {data.post.comment_count} comment{data.post.comment_count === 1 ? '' : 's'}
				</div>

				{#if data.post.body}
					<div class="prose prose-invert prose-sm max-w-none mt-4 whitespace-pre-wrap text-foreground/90">
						{data.post.body}
					</div>
				{/if}

				<section class="mt-5 rounded-md border border-primary/30 bg-primary/5 p-4">
					<div class="flex items-center justify-between gap-2 mb-2">
						<div class="flex items-center gap-2 text-sm font-semibold text-primary">
							<Sparkles class="h-4 w-4" />
							AI Summary
						</div>
						<Button
							type="button"
							size="sm"
							variant="ghost"
							onclick={generateSummary}
							disabled={summarizing}
							class="text-primary hover:text-primary hover:bg-primary/10"
						>
							<RefreshCw class="h-3.5 w-3.5 {summarizing ? 'animate-spin' : ''}" />
							{summarizing ? 'Working…' : summary ? 'Regenerate' : 'Generate'}
						</Button>
					</div>
					{#if summary}
						<p class="text-sm leading-relaxed text-foreground/90">{summary}</p>
					{:else if summaryError}
						<p class="text-sm text-destructive">{summaryError}</p>
					{:else}
						<p class="text-sm italic text-muted-foreground">
							No summary yet. Click "Generate" to create one.
						</p>
					{/if}
				</section>
			</div>
		</div>
	</article>

	<section>
		<div class="flex items-center justify-between mb-4">
			<h2 class="text-lg font-semibold flex items-center gap-2">
				Discussions
				<span class="text-muted-foreground font-normal">({data.post.comment_count})</span>
			</h2>
			<div class="inline-flex rounded-md border border-border p-0.5 text-xs">
				<button
					type="button"
					class="rounded px-2 py-1 transition-colors {commentSort === 'top'
						? 'bg-primary text-primary-foreground'
						: 'text-muted-foreground hover:text-foreground'}"
					onclick={() => (commentSort = 'top')}
				>
					Top
				</button>
				<button
					type="button"
					class="rounded px-2 py-1 transition-colors {commentSort === 'new'
						? 'bg-primary text-primary-foreground'
						: 'text-muted-foreground hover:text-foreground'}"
					onclick={() => (commentSort = 'new')}
				>
					New
				</button>
			</div>
		</div>

		{#if tree.length === 0}
			<p class="text-sm text-muted-foreground py-4">No comments yet — start the discussion.</p>
		{:else}
			{#snippet renderComment(c: CommentNode, depth: number)}
				{@const isAuthor = c.user_id === data.post.user_id}
				{@const username = c.username ?? 'anon'}
				{@const initials = username.slice(0, 2).toUpperCase()}
				<div class={depth > 0 ? 'mt-3 border-l border-border pl-4' : 'mt-3'}>
					<div class="flex items-start gap-3">
						<div class="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-semibold {avatarColor(username)} shrink-0">
							{initials}
						</div>
						<div class="flex-1 min-w-0">
							<div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
								<span class="font-semibold text-foreground">{username}</span>
								{#if isAuthor}
									<span class="inline-flex items-center rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wider">
										OP
									</span>
								{/if}
								<span class="text-muted-foreground tabular-nums">· {c.score}</span>
								<span class="text-muted-foreground">· {timeAgo(c.created_at)}</span>
							</div>
							<p class="text-sm mt-1 whitespace-pre-wrap text-foreground/90">{c.body}</p>
							<div class="mt-1.5 flex items-center gap-4 text-xs text-muted-foreground">
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
										class="inline-flex items-center gap-1 hover:text-primary {c.user_vote === 1
											? 'text-primary'
											: ''}"
										aria-label="Upvote comment"
									>
										<ChevronUp class="h-3.5 w-3.5" strokeWidth={2.4} />
										Upvote
									</button>
								</form>
								{#if data.user}
									<button
										type="button"
										class="inline-flex items-center gap-1 hover:text-foreground"
										onclick={() => (replyTo = replyTo === c.id ? null : c.id)}
									>
										<MessageSquare class="h-3 w-3" /> Reply
									</button>
								{/if}
							</div>

							{#if replyTo === c.id && data.user}
								<form
									method="POST"
									action="?/comment"
									use:enhance={enhanceReply(c.id)}
									class="mt-3 space-y-2"
								>
									<input type="hidden" name="parent_id" value={c.id} />
									<Textarea
										name="body"
										placeholder="Write a reply…"
										required
										rows={3}
										bind:value={replyBodies[c.id]}
										disabled={replyPendingId === c.id}
									/>
									{#if form?.message && form.parentId === c.id}
										<p class="text-sm text-destructive">{form.message}</p>
									{/if}
									<div class="flex justify-end gap-2">
										<Button
											type="button"
											size="sm"
											variant="ghost"
											onclick={() => (replyTo = null)}
											disabled={replyPendingId === c.id}
										>
											Cancel
										</Button>
										<Button type="submit" size="sm" disabled={replyPendingId === c.id}>
											<Send class="h-3.5 w-3.5" /> {replyPendingId === c.id ? 'Posting…' : 'Reply'}
										</Button>
									</div>
								</form>
							{/if}

							{#each c.children as child (child.id)}
								{@render renderComment(child, depth + 1)}
							{/each}
						</div>
					</div>
				</div>
			{/snippet}

			<div>
				{#each tree as root (root.id)}
					{@render renderComment(root, 0)}
				{/each}
			</div>
		{/if}

		{#if data.user}
			<form method="POST" action="?/comment" use:enhance={enhanceRootComment} class="mt-6 space-y-2 rounded-lg border bg-card p-3">
				<Textarea
					name="body"
					placeholder="Add to the discussion…"
					required
					rows={3}
					bind:value={rootCommentBody}
					disabled={rootCommentPending}
				/>
				{#if form?.message && !form.parentId}
					<p class="text-sm text-destructive">{form.message}</p>
				{/if}
				<div class="flex justify-end">
					<Button type="submit" size="sm" class="uppercase tracking-wider" disabled={rootCommentPending}>
						<Send class="h-3.5 w-3.5" /> {rootCommentPending ? 'Posting…' : 'Post Comment'}
					</Button>
				</div>
			</form>
		{:else}
			<p class="text-sm text-muted-foreground mt-4">
				<a href="/login" class="text-primary hover:underline">Log in</a> to join the discussion.
			</p>
		{/if}
	</section>
</div>
