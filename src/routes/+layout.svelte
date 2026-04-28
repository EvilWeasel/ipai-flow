<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/button.svelte';
	import { Flame, LogOut, PenSquare, Sparkles, User } from 'lucide-svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();
</script>

<svelte:head>
	<title>IPAI Flow</title>
	<meta name="description" content="A Hacker News-style discussion platform for the IPAI community." />
</svelte:head>

<div class="min-h-screen flex flex-col">
	<header class="border-b bg-card sticky top-0 z-10">
		<div class="mx-auto max-w-4xl px-4 h-14 flex items-center gap-4">
			<a href="/" class="flex items-center gap-2 font-bold tracking-tight">
				<span class="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
					<Flame class="h-4 w-4" />
				</span>
				IPAI Flow
			</a>
			<nav class="flex items-center gap-1 text-sm text-muted-foreground">
				<a href="/" class="px-2 py-1 rounded hover:text-foreground" class:text-foreground={page.url.pathname === '/'}>Hot</a>
				<a href="/?sort=new" class="px-2 py-1 rounded hover:text-foreground">New</a>
				<a href="/?sort=top" class="px-2 py-1 rounded hover:text-foreground">Top</a>
				<a href="/digest" class="px-2 py-1 rounded hover:text-foreground inline-flex items-center gap-1">
					<Sparkles class="h-3.5 w-3.5" /> Digest
				</a>
			</nav>
			<div class="ml-auto flex items-center gap-2">
				{#if data.user}
					<Button href="/submit" size="sm" variant="default">
						<PenSquare class="h-4 w-4" /> Submit
					</Button>
					<span class="text-sm text-muted-foreground hidden sm:inline-flex items-center gap-1">
						<User class="h-3.5 w-3.5" />
						{data.user.username} · {data.user.karma}
					</span>
					<form method="POST" action="/logout">
						<Button type="submit" size="icon" variant="ghost" title="Log out">
							<LogOut class="h-4 w-4" />
						</Button>
					</form>
				{:else}
					<Button href="/login" size="sm" variant="ghost">Log in</Button>
					<Button href="/register" size="sm">Register</Button>
				{/if}
			</div>
		</div>
	</header>

	<main class="flex-1">
		{@render children()}
	</main>

	<footer class="border-t mt-12">
		<div class="mx-auto max-w-4xl px-4 py-6 text-xs text-muted-foreground flex flex-wrap gap-4 justify-between">
			<span>IPAI Flow · self-hosted · GDPR-friendly · no tracking</span>
			<span>SvelteKit · shadcn-svelte · Tailwind</span>
		</div>
	</footer>
</div>
