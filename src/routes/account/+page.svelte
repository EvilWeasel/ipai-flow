<script lang="ts">
	import Button from '$lib/components/ui/button.svelte';
	import { invalidateAll } from '$app/navigation';
	import { Award, LogOut, MessageSquare, ShieldCheck, User as UserIcon } from 'lucide-svelte';
	import { hostname, tagsOf, timeAgo } from '$lib/utils';
	import { onMount } from 'svelte';

	let { data } = $props();

	const initials = $derived(data.user.username.slice(0, 2).toUpperCase());
	const hasPendingPosts = $derived(data.posts.some((post) => post.moderation_status === 'pending'));

	onMount(() => {
		const interval = window.setInterval(() => {
			if (hasPendingPosts) void invalidateAll();
		}, 3000);
		return () => window.clearInterval(interval);
	});
</script>

<div class="mx-auto max-w-2xl px-4 py-6 space-y-6">
	<header>
		<h1 class="text-3xl font-bold tracking-tight">Account</h1>
		<p class="text-sm text-muted-foreground">Manage your IPAI Flow profile.</p>
	</header>

	<section class="rounded-lg border bg-card p-5">
		<div class="flex items-center gap-4">
			<div class="h-14 w-14 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold tracking-wider">
				{initials}
			</div>
			<div>
				<div class="text-lg font-semibold flex items-center gap-2">
					<UserIcon class="h-4 w-4 text-muted-foreground" />
					{data.user.username}
				</div>
				<div class="text-xs text-muted-foreground">joined {timeAgo(data.user.created_at)}</div>
			</div>
			<div class="ml-auto text-right">
				<div class="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1 justify-end">
					<Award class="h-3.5 w-3.5" /> Karma
				</div>
				<div class="text-2xl font-semibold tabular-nums text-primary">{data.user.karma}</div>
			</div>
		</div>
	</section>

	<section class="rounded-lg border bg-card p-5 flex items-start gap-3">
		<ShieldCheck class="h-5 w-5 mt-0.5 text-primary" />
		<div class="text-sm text-muted-foreground leading-relaxed">
			<p class="text-foreground font-medium mb-1">Data-minimized account</p>
			Your account holds nothing but a username and a salted password hash. No email, no
			tracking, no third-party storage.
		</div>
	</section>

	<form method="POST" action="/logout">
		<Button type="submit" variant="outline" class="w-full justify-center">
			<LogOut class="h-4 w-4" /> Log out
		</Button>
	</form>

	<section>
		<h2 class="mb-3 text-lg font-semibold">Your Posts</h2>
		{#if data.posts.length === 0}
			<p class="rounded-lg border bg-card p-5 text-sm text-muted-foreground">You have not posted yet.</p>
		{:else}
			<ol class="space-y-3">
				{#each data.posts as post (post.id)}
					{@const tags = tagsOf(post.tags)}
					<li class="rounded-lg border bg-card p-4">
						<h3 class="text-[17px] font-semibold leading-snug">
							<a href="/post/{post.id}" class="hover:text-primary transition-colors">{post.title}</a>
						</h3>
						{#if post.moderation_status === 'pending'}
							<span class="mt-2 inline-flex items-center rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
								Pending AI moderation
							</span>
						{:else if post.moderation_status === 'blocked'}
							<span class="mt-2 inline-flex items-center rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive">
								Removed by moderation
							</span>
						{/if}
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
