<script lang="ts">
	import { MessageSquare } from 'lucide-svelte';
	import { hostname, tagsOf, timeAgo } from '$lib/utils';

	let { data } = $props();

	const initials = $derived(data.user.username.slice(0, 2).toUpperCase());
</script>

<div class="mx-auto max-w-2xl px-4 py-6 space-y-6">
	<header>
		<h1 class="text-3xl font-bold tracking-tight">{data.user.username}</h1>
		<p class="text-sm text-muted-foreground">
			joined {timeAgo(data.user.created_at)} · {data.user.karma} karma
		</p>
	</header>

	<section class="rounded-lg border bg-card p-5">
		<div class="flex items-center gap-4">
			<div class="h-14 w-14 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold tracking-wider">
				{initials}
			</div>
			<div>
				<div class="text-lg font-semibold">{data.user.username}</div>
				<div class="text-xs text-muted-foreground">Public profile</div>
			</div>
		</div>
	</section>

	<section>
		<h2 class="mb-3 text-lg font-semibold">Posts</h2>
		{#if data.posts.length === 0}
			<p class="rounded-lg border bg-card p-5 text-sm text-muted-foreground">No posts yet.</p>
		{:else}
			<ol class="space-y-3">
				{#each data.posts as post (post.id)}
					{@const tags = tagsOf(post.tags)}
					<li class="rounded-lg border bg-card p-4">
						<h3 class="text-[17px] font-semibold leading-snug">
							<a href="/post/{post.id}" class="hover:text-primary transition-colors">{post.title}</a>
						</h3>
						{#if post.url}
							<a
								href={post.url}
								target="_blank"
								rel="noopener noreferrer"
								class="mt-1 inline-block max-w-full truncate text-xs font-medium text-primary underline decoration-primary/45 underline-offset-4 transition-colors hover:text-primary/80 hover:decoration-primary"
							>
								{hostname(post.url)}
							</a>
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
							<span>{timeAgo(post.created_at)}</span>
							<span>·</span>
							<span>{post.score} point{post.score === 1 ? '' : 's'}</span>
							<a href="/post/{post.id}" class="ml-auto inline-flex items-center gap-1 hover:text-foreground">
								<MessageSquare class="h-3.5 w-3.5" />
								{post.comment_count} comment{post.comment_count === 1 ? '' : 's'}
							</a>
						</div>
					</li>
				{/each}
			</ol>
		{/if}
	</section>
</div>
