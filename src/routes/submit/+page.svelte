<script lang="ts">
	import Button from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import Textarea from '$lib/components/ui/textarea.svelte';

	let { form } = $props();
</script>

<div class="mx-auto max-w-2xl px-4 py-6">
	<h1 class="text-2xl font-bold mb-1">Submit a post</h1>
	<p class="text-sm text-muted-foreground mb-6">
		Share a link, ask a question, or start a discussion. Provide a URL <em>or</em> body text.
	</p>

	<form method="POST" class="space-y-4">
		<div class="space-y-1.5">
			<Label for="title">Title</Label>
			<Input
				id="title"
				name="title"
				required
				maxlength={200}
				value={form?.title ?? ''}
				placeholder="A clear, descriptive title"
			/>
		</div>

		<div class="space-y-1.5">
			<Label for="url">URL <span class="text-muted-foreground font-normal">(optional)</span></Label>
			<Input
				id="url"
				name="url"
				type="url"
				value={form?.urlRaw ?? ''}
				placeholder="https://…"
			/>
		</div>

		<div class="space-y-1.5">
			<Label for="body">Text <span class="text-muted-foreground font-normal">(optional)</span></Label>
			<Textarea id="body" name="body" rows={8} value={form?.body ?? ''} />
		</div>

		{#if form?.message}
			<p class="text-sm text-destructive">{form.message}</p>
		{/if}

		<div class="flex justify-end gap-2">
			<Button href="/" variant="ghost">Cancel</Button>
			<Button type="submit">Submit</Button>
		</div>
	</form>
</div>
