<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';

	let { form } = $props();
	const formData = $derived(form as { message?: string; username?: string } | undefined);
	let pending = $state(false);
</script>

<div class="mx-auto max-w-md px-4 py-10">
	<header class="mb-6 text-center">
		<h1 class="text-3xl font-bold tracking-tight">Welcome back</h1>
		<p class="text-sm text-muted-foreground mt-1">Log in to IPAI Flow.</p>
	</header>

	<form
		method="POST"
		use:enhance={() => {
			pending = true;
			return async ({ update }) => {
				await update();
				pending = false;
			};
		}}
		class="rounded-lg border bg-card p-5 space-y-4"
	>
		<div class="space-y-1.5">
			<Label for="username" class="text-xs uppercase tracking-wider text-muted-foreground">
				Username
			</Label>
			<Input id="username" name="username" required value={formData?.username ?? ''} autocomplete="username" disabled={pending} />
		</div>
		<div class="space-y-1.5">
			<Label for="password" class="text-xs uppercase tracking-wider text-muted-foreground">
				Password
			</Label>
			<Input id="password" name="password" type="password" required autocomplete="current-password" disabled={pending} />
		</div>
		{#if formData?.message}
			<p class="text-sm text-destructive" role="alert">{formData.message}</p>
		{/if}
		<Button type="submit" class="w-full uppercase tracking-wider" disabled={pending}>
			{pending ? 'Logging in…' : 'Log in'}
		</Button>
	</form>

	<p class="text-sm text-muted-foreground text-center mt-4">
		No account? <a href="/register" class="text-primary hover:underline">Register</a>
	</p>
</div>
