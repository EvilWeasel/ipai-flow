<script lang="ts">
	import Button from '$lib/components/ui/button.svelte';
	import { ChevronUp, MessageSquare, Sparkles } from 'lucide-svelte';
	import { hostname, tagsOf, timeAgo } from '$lib/utils';

	let { data } = $props();

	function rangeLabel(hours: number): string {
		if (hours === 24) return 'last 24 hours';
		if (hours === 24 * 7) return 'last 7 days';
		return 'last 30 days';
	}
</script>

<div class="mx-auto max-w-3xl px-4 py-4 space-y-6">
	<header class="space-y-2">
		<span class="inline-flex items-center rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
			Daily Digest
		</span>
		<h1 class="text-3xl font-bold leading-tight">
			Top stories from the {rangeLabel(data.hours)}
		</h1>
		<nav class="flex flex-wrap gap-2 pt-2" aria-label="Digest windows">
			{#each data.windows as hours}
				<a
					href="/digest?hours={hours}"
					aria-current={data.hours === hours ? 'page' : undefined}
					class="rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors {data.hours === hours ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}"
				>
					{rangeLabel(hours)}
				</a>
			{/each}
		</nav>
	</header>

	{#if data.intro}
		<section class="rounded-lg border border-primary/30 bg-primary/5 p-4">
			<div class="flex items-center gap-2 mb-2 text-sm font-semibold text-primary">
				<Sparkles class="h-4 w-4" /> Community Signal
			</div>
			<p class="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{data.intro}</p>
		</section>
	{/if}

	{#if data.trendingTags && data.trendingTags.length > 0}
		<section>
			<h2 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
				Trending Themes
			</h2>
			<div class="flex flex-wrap gap-2">
				{#each data.trendingTags as tag}
					<span class="inline-flex items-center rounded-md bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
						#{tag}
					</span>
				{/each}
			</div>
		</section>
	{/if}

	{#if !data.dbError && data.posts.length > 0}
		<div class="grid gap-4 md:grid-cols-2">
			<section class="rounded-lg border bg-card p-4">
				<h2 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
					Most Discussed
				</h2>
				<ol class="space-y-3">
					{#each data.mostDiscussed as post}
						<li class="min-w-0">
							<a href="/post/{post.id}" class="block truncate text-sm font-semibold hover:text-primary">
								{post.title}
							</a>
							<div class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
								<MessageSquare class="h-3.5 w-3.5" />
								<span>{post.comment_count} comments</span>
								<span>by {post.username}</span>
							</div>
						</li>
					{/each}
				</ol>
			</section>

			<section class="rounded-lg border bg-card p-4">
				<h2 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
					Highest Signal
				</h2>
				<ol class="space-y-3">
					{#each data.highestSignal as post}
						<li class="min-w-0">
							<a href="/post/{post.id}" class="block truncate text-sm font-semibold hover:text-primary">
								{post.title}
							</a>
							<div class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
								<ChevronUp class="h-3.5 w-3.5" />
								<span>{post.score} points</span>
								<span>by {post.username}</span>
							</div>
						</li>
					{/each}
				</ol>
			</section>
		</div>
	{/if}

	<section>
		<div class="flex items-center justify-between mb-3">
			<h2 class="text-lg font-semibold">Digest Feed</h2>
		</div>

		{#if data.dbError}
			<p class="text-destructive text-sm">{data.dbError}</p>
		{:else if data.posts.length === 0}
			<p class="text-muted-foreground text-sm">No posts in this window yet.</p>
		{:else}
			<ol class="space-y-3">
				{#each data.posts as post (post.id)}
					{@const tags = tagsOf(post.tags)}
					<li class="rounded-lg border bg-card p-4">
						<div class="flex gap-3">
							<div class="flex flex-col items-center w-10 shrink-0 select-none text-muted-foreground">
								<ChevronUp class="h-4 w-4" strokeWidth={2.4} />
								<span class="text-sm font-semibold tabular-nums text-foreground">
									{post.score}
								</span>
							</div>
							<div class="flex-1 min-w-0">
								<a href="/post/{post.id}" class="text-base font-semibold hover:text-primary transition-colors">
									{post.title}
								</a>
								{#if post.url}
									<div class="text-xs text-muted-foreground mt-0.5 truncate">
										({hostname(post.url)})
									</div>
								{/if}
								{#if post.ai_summary}
									<p class="text-sm text-muted-foreground mt-1.5 line-clamp-2">{post.ai_summary}</p>
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
									<span>by <span class="text-foreground/90">{post.username}</span></span>
									<span>·</span>
									<span>{timeAgo(post.created_at)}</span>
									<span class="ml-auto inline-flex items-center gap-1">
										<MessageSquare class="h-3.5 w-3.5" />
										{post.comment_count}
									</span>
								</div>
							</div>
						</div>
					</li>
				{/each}
			</ol>

			<div class="mt-6 flex justify-center">
				<Button variant="outline" href="/?sort=top" class="uppercase tracking-wider">
					Load More Discussions
				</Button>
			</div>
		{/if}
	</section>
</div>
