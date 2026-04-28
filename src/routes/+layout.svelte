<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import { MessageSquare, PlusSquare, Search, User } from 'lucide-svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	const navItems = $derived([
		{ href: '/', label: 'Feed', icon: MessageSquare, match: (p: string) => p === '/' || p.startsWith('/post') || p.startsWith('/digest') },
		{ href: '/submit', label: 'Submit', icon: PlusSquare, match: (p: string) => p.startsWith('/submit') },
		{ href: data.user ? '/account' : '/login', label: 'Account', icon: User, match: (p: string) => p.startsWith('/account') || p.startsWith('/login') || p.startsWith('/register') }
	] as const);
</script>

<svelte:head>
	<title>IPAI Community</title>
	<meta name="description" content="A discussion platform for the IPAI community." />
</svelte:head>

<div class="min-h-dvh flex flex-col bg-background">
	<header class="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
		<div class="mx-auto max-w-3xl px-4 h-14 flex items-center gap-3">
			<a href="/" class="flex items-center gap-2 font-semibold tracking-tight">
				<span class="inline-flex h-7 w-7 items-center justify-center text-primary" aria-hidden="true">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" class="h-6 w-6">
						<circle cx="12" cy="12" r="2.2" fill="currentColor" />
						<circle cx="4" cy="12" r="1.4" fill="currentColor" />
						<circle cx="20" cy="12" r="1.4" fill="currentColor" />
						<circle cx="12" cy="4" r="1.4" fill="currentColor" />
						<circle cx="12" cy="20" r="1.4" fill="currentColor" />
						<circle cx="6.2" cy="6.2" r="1.2" fill="currentColor" />
						<circle cx="17.8" cy="6.2" r="1.2" fill="currentColor" />
						<circle cx="6.2" cy="17.8" r="1.2" fill="currentColor" />
						<circle cx="17.8" cy="17.8" r="1.2" fill="currentColor" />
						<line x1="12" y1="12" x2="4" y2="12" />
						<line x1="12" y1="12" x2="20" y2="12" />
						<line x1="12" y1="12" x2="12" y2="4" />
						<line x1="12" y1="12" x2="12" y2="20" />
						<line x1="12" y1="12" x2="6.2" y2="6.2" />
						<line x1="12" y1="12" x2="17.8" y2="6.2" />
						<line x1="12" y1="12" x2="6.2" y2="17.8" />
						<line x1="12" y1="12" x2="17.8" y2="17.8" />
					</svg>
				</span>
				<span class="text-primary text-[15px]">IPAI Community</span>
			</a>
			<div class="ml-auto flex items-center gap-1">
				<button
					type="button"
					aria-label="Search"
					class="inline-flex h-9 w-9 items-center justify-center rounded-md text-primary hover:bg-muted transition-colors"
				>
					<Search class="h-5 w-5" />
				</button>
			</div>
		</div>
	</header>

	<main class="flex-1 pb-20">
		{@render children()}
	</main>

	<nav class="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background pb-safe">
		<div class="mx-auto max-w-3xl grid grid-cols-3">
			{#each navItems as item (item.href)}
				{@const active = item.match(page.url.pathname)}
				<a
					href={item.href}
					class="relative flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] uppercase tracking-wider transition-colors {active
						? 'text-primary'
						: 'text-muted-foreground hover:text-foreground'}"
				>
					{#if active}
						<span class="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-12 rounded-b bg-primary"></span>
					{/if}
					<item.icon class="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
					<span class="font-medium">{item.label}</span>
				</a>
			{/each}
		</div>
	</nav>
</div>
