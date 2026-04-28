<script lang="ts">
	import Button from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import Textarea from '$lib/components/ui/textarea.svelte';
	import { Bot } from 'lucide-svelte';

	let { form } = $props();
</script>

<div class="mx-auto max-w-2xl px-4 py-6 space-y-6">
	<header>
		<h1 class="text-3xl font-bold tracking-tight">Submit a Post</h1>
		<p class="text-sm text-muted-foreground mt-1">
			Share research, tools, or thoughts with the community.
		</p>
	</header>

	<form method="POST" class="rounded-lg border bg-card p-5 space-y-5">
		<div class="space-y-1.5">
			<Label for="title" class="text-xs uppercase tracking-wider text-muted-foreground">
				Title <span class="text-primary">*</span>
			</Label>
			<Input
				id="title"
				name="title"
				required
				maxlength={200}
				value={form?.title ?? ''}
				placeholder="Enter a descriptive title…"
				class="h-11"
			/>
		</div>

		<div class="space-y-1.5">
			<Label for="tags" class="text-xs uppercase tracking-wider text-muted-foreground">
				Tags <span class="text-muted-foreground/70 normal-case">(up to 5, comma-separated)</span>
			</Label>
			<Input
				id="tags"
				name="tags"
				maxlength={200}
				value={form?.tagsRaw ?? ''}
				placeholder="AIResearch, LLMs, Architecture"
			/>
		</div>

		<div class="relative flex items-center py-1">
			<div class="flex-1 h-px bg-border"></div>
			<span class="px-3 text-[11px] uppercase tracking-wider text-muted-foreground">
				Provide a link or text
			</span>
			<div class="flex-1 h-px bg-border"></div>
		</div>

		<div class="space-y-1.5">
			<Label for="url" class="text-xs uppercase tracking-wider text-muted-foreground">URL</Label>
			<Input
				id="url"
				name="url"
				type="url"
				value={form?.urlRaw ?? ''}
				placeholder="https://…"
			/>
		</div>

		<div class="relative flex items-center">
			<div class="flex-1 h-px bg-border"></div>
			<span class="px-3 text-[11px] uppercase tracking-wider text-muted-foreground">or</span>
			<div class="flex-1 h-px bg-border"></div>
		</div>

		<div class="space-y-1.5">
			<Label for="body" class="text-xs uppercase tracking-wider text-muted-foreground">Text</Label>
			<Textarea
				id="body"
				name="body"
				rows={7}
				value={form?.body ?? ''}
				placeholder="Discuss your topic…"
			/>
		</div>

		{#if form?.message}
			<p class="text-sm text-destructive">{form.message}</p>
		{/if}

		<div class="flex justify-end gap-2 pt-1">
			<Button href="/" variant="ghost">Cancel</Button>
			<Button type="submit" class="uppercase tracking-wider">Submit Post</Button>
		</div>
	</form>

	<aside class="rounded-lg border bg-card p-4 flex items-start gap-3">
		<span class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary shrink-0">
			<Bot class="h-5 w-5" />
		</span>
		<div class="text-sm leading-relaxed">
			<p class="text-xs uppercase tracking-wider text-muted-foreground mb-1">
				AI-Assisted Moderation
			</p>
			<p class="text-muted-foreground">
				To maintain a high-signal environment, all submissions are pre-screened by our AI
				moderation system for quality and relevance to the IPAI guidelines. This process is
				fully GDPR compliant — no email or personally identifiable information is required,
				processed, or stored.
			</p>
		</div>
	</aside>
</div>
