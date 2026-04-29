<script lang="ts">
	import Button from '$lib/components/ui/button.svelte';
	import { Award, LogOut, ShieldCheck, User as UserIcon } from 'lucide-svelte';
	import { timeAgo } from '$lib/utils';

	let { data } = $props();

	const initials = $derived(data.user.username.slice(0, 2).toUpperCase());
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
</div>
