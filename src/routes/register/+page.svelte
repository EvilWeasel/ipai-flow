<script lang="ts">
	import Button from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';

	let { form } = $props();
</script>

<div class="mx-auto max-w-md px-4 py-10">
	<header class="mb-6 text-center">
		<h1 class="text-3xl font-bold tracking-tight">Create an account</h1>
		<p class="text-sm text-muted-foreground mt-1">
			Self-hosted, no email required. Just pick a username.
		</p>
	</header>

	<form method="POST" class="rounded-lg border bg-card p-5 space-y-4">
		<div class="space-y-1.5">
			<Label for="username" class="text-xs uppercase tracking-wider text-muted-foreground">
				Username
			</Label>
			<Input id="username" name="username" required value={form?.username ?? ''} autocomplete="username" />
		</div>
		<div class="space-y-1.5">
			<Label for="password" class="text-xs uppercase tracking-wider text-muted-foreground">
				Password
			</Label>
			<Input id="password" name="password" type="password" required minlength={8} autocomplete="new-password" />
			<p class="text-xs text-muted-foreground">At least 8 characters.</p>
		</div>
		{#if form?.message}
			<p class="text-sm text-destructive">{form.message}</p>
		{/if}
		<Button type="submit" class="w-full uppercase tracking-wider">Register</Button>
	</form>

	<p class="text-sm text-muted-foreground text-center mt-4">
		Already have an account? <a href="/login" class="text-primary hover:underline">Log in</a>
	</p>
</div>
