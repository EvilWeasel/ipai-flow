<script lang="ts">
	import { enhance } from '$app/forms';
	import { ChevronUp, MessageSquare } from 'lucide-svelte';
	import { hostname, tagsOf, timeAgo } from '$lib/utils';
	import Button from '$lib/components/ui/button.svelte';

	let { data } = $props();

	const tabs = [
		{ id: 'hot', label: 'Hot', href: '/' },
		{ id: 'new', label: 'New', href: '/?sort=new' },
		{ id: 'top', label: 'Top', href: '/?sort=top' },
		{ id: 'digest', label: 'Digest', href: '/digest' }
	] as const;

	const feedSignal = $derived.by(() => {
		const now = Math.floor(Date.now() / 1000);
		const lastDay = data.posts.filter((post) => now - post.created_at <= 86400).length;
		const activeDiscussions = data.posts.reduce((sum, post) => sum + post.comment_count, 0);
		const tagCounts = new Map<string, number>();
		for (const post of data.posts) {
			for (const tag of tagsOf(post.tags)) {
				tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
			}
		}
		const topTags = [...tagCounts.entries()]
			.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
			.slice(0, 3)
			.map(([tag]) => tag);

		return { lastDay, activeDiscussions, topTags };
	});

	const userHref = (username: string | undefined) => `/user/${encodeURIComponent(username ?? 'anon')}`;
</script>

<div class="mx-auto max-w-3xl px-4 pt-2 pb-4">
	<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border py-3 text-xs text-muted-foreground">
		<div>
			<span class="font-semibold text-foreground">IPAI Flow</span>
			<span class="ml-2">community signal</span>
		</div>
		<div class="flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums">
			<span>{feedSignal.lastDay} post{feedSignal.lastDay === 1 ? '' : 's'} in 24h</span>
			<span>{feedSignal.activeDiscussions} comment{feedSignal.activeDiscussions === 1 ? '' : 's'}</span>
			{#if feedSignal.topTags.length > 0}
				<span>{feedSignal.topTags.map((tag) => `#${tag}`).join(' ')}</span>
			{/if}
		</div>
	</div>
	<nav class="flex items-center gap-6 border-b border-border">
		{#each tabs as t (t.id)}
			{@const active = t.id !== 'digest' && data.sort === t.id}
			<a
				href={t.href}
				class="relative -mb-px py-3 text-sm font-medium transition-colors {active
					? 'text-foreground'
					: 'text-muted-foreground hover:text-foreground'}"
			>
				{t.label}
				{#if active}
					<span class="absolute inset-x-0 -bottom-px h-[2px] bg-primary"></span>
				{/if}
			</a>
		{/each}
	</nav>
</div>

<div class="mx-auto max-w-3xl px-4 pb-6">
	{#if data.dbError}
		<div class="rounded-lg border bg-card p-10 text-center">
			<p class="text-destructive">{data.dbError}</p>
		</div>
	{:else if data.posts.length === 0}
		<div class="rounded-lg border bg-card p-10 text-center">
			<p class="text-muted-foreground mb-4">No posts yet — be the first to share something.</p>
			<Button href="/submit">Submit a post</Button>
		</div>
	{:else}
		<ol class="space-y-3">
			{#each data.posts as post (post.id)}
				{@const tags = tagsOf(post.tags)}
				<li class="rounded-lg border bg-card p-4">
					<div class="flex gap-3">
						<div class="flex flex-col items-center w-10 shrink-0 select-none">
							<form method="POST" action="?/vote" use:enhance>
								<input type="hidden" name="id" value={post.id} />
								<input type="hidden" name="value" value={post.user_vote === 1 ? 0 : 1} />
								<button
									type="submit"
									class="p-1 rounded transition-colors {post.user_vote === 1
										? 'text-primary'
										: 'text-muted-foreground hover:text-primary'}"
									aria-label="Upvote"
									title="Upvote"
								>
									<ChevronUp class="h-5 w-5" strokeWidth={2.4} />
								</button>
							</form>
							<span
								class="mt-0.5 text-sm font-semibold tabular-nums {post.user_vote === 1
									? 'text-primary'
									: 'text-foreground'}"
							>
								{post.score}
							</span>
						</div>

						<div class="flex-1 min-w-0">
							<h2 class="text-[17px] font-semibold leading-snug">
								<a href="/post/{post.id}" class="hover:text-primary transition-colors">
									{post.title}
								</a>
							</h2>

							{#if post.url}
								<div class="mt-1 truncate text-xs">
									<a
										href={post.url}
										target="_blank"
										rel="noopener noreferrer"
										class="font-medium text-primary underline decoration-primary/45 underline-offset-4 transition-colors hover:text-primary/80 hover:decoration-primary"
									>
										{hostname(post.url)}
									</a>
								</div>
							{/if}

							{#if tags.length > 0}
								<div class="mt-2 flex flex-wrap gap-1.5">
									{#each tags as tag}
										<span class="inline-flex items-center rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
											#{tag}
										</span>
									{/each}
								</div>
							{/if}

							<div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
								<span>
									by
									<a
										href={userHref(post.username)}
										class="font-medium text-foreground/90 underline-offset-4 hover:text-primary hover:underline"
									>
										{post.username}
									</a>
								</span>
								<span>·</span>
								<span>{timeAgo(post.created_at)}</span>
								<a
									href="/post/{post.id}"
									class="ml-auto inline-flex items-center gap-1 hover:text-foreground"
								>
									<MessageSquare class="h-3.5 w-3.5" />
									{post.comment_count} comment{post.comment_count === 1 ? '' : 's'}
								</a>
							</div>
						</div>
					</div>
				</li>
			{/each}
		</ol>

		{#if data.posts.length >= (data.limit ?? 50)}
			<div class="mt-6 flex justify-center">
				<Button variant="outline" href="/?sort={data.sort}&limit={(data.limit ?? 50) + 25}">
					Load More
				</Button>
			</div>
		{/if}
	{/if}
</div>
