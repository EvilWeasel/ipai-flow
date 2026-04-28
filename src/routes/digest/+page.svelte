<script lang="ts">
	import { hostname, timeAgo } from '$lib/utils';
	import { Sparkles } from 'lucide-svelte';

	let { data } = $props();
</script>

<div class="mx-auto max-w-3xl px-4 py-6">
	<header class="mb-6">
		<div class="flex items-center gap-2 text-sm text-muted-foreground">
			<Sparkles class="h-4 w-4" />
			Automated digest · last {data.hours} hours
		</div>
		<h1 class="text-2xl font-bold mt-1">What the community discussed</h1>
	</header>

	{#if data.intro}
		<div class="rounded-lg border bg-muted/40 p-4 mb-6 prose prose-sm max-w-none">
			{data.intro}
		</div>
	{/if}

	{#if data.posts.length === 0}
		<p class="text-muted-foreground">No posts in this window yet.</p>
	{:else}
		<ol class="space-y-3">
			{#each data.posts as post, i (post.id)}
				<li class="rounded-lg border bg-card p-3">
					<div class="flex items-baseline gap-2">
						<span class="text-xs text-muted-foreground tabular-nums w-5">{i + 1}.</span>
						<a href="/post/{post.id}" class="font-medium hover:underline">
							{post.title}
						</a>
						{#if post.url}
							<span class="text-xs text-muted-foreground">({hostname(post.url)})</span>
						{/if}
					</div>
					{#if post.ai_summary}
						<p class="text-sm text-muted-foreground mt-1 ml-7">{post.ai_summary}</p>
					{/if}
					<div class="text-xs text-muted-foreground mt-1.5 ml-7">
						{post.score} points · {post.comment_count} comments · {timeAgo(post.created_at)} · by {post.username}
					</div>
				</li>
			{/each}
		</ol>
	{/if}
</div>
