<script lang="ts">
	import Button from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';

	let { form } = $props();
</script>

<div class="mx-auto max-w-md px-4 py-12">
	<h1 class="text-2xl font-bold mb-1">Log in</h1>
	<p class="text-sm text-muted-foreground mb-6">Welcome back to IPAI Flow.</p>

	<form method="POST" class="space-y-4">
		<div class="space-y-1.5">
			<Label for="username">Username</Label>
			<Input id="username" name="username" required value={form?.username ?? ''} autocomplete="username" />
		</div>
		<div class="space-y-1.5">
			<Label for="password">Password</Label>
			<Input id="password" name="password" type="password" required autocomplete="current-password" />
		</div>
		{#if form?.message}
			<p class="text-sm text-destructive">{form.message}</p>
		{/if}
		<Button type="submit" class="w-full">Log in</Button>
	</form>

	<p class="text-sm text-muted-foreground text-center mt-4">
		No account? <a href="/register" class="underline">Register</a>
	</p>
</div>
