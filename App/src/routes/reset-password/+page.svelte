<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Alert from '$lib/components/Alert.svelte';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';

	let { data, form } = $props();

	/**
	 * Read straight from the URL rather than through `load`. It is already in
	 * the address bar — round-tripping it through the SSR payload would only
	 * copy it somewhere else.
	 */
	const token = $derived(page.url.searchParams.get('token') ?? '');

	let submitting = $state(false);
</script>

<svelte:head>
	<title>Set a new password | YADA</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="flex min-h-svh flex-col bg-surface">
	<header class="shrink-0">
		<div class="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
			<img src="/logo.svg" alt="YADA" class="h-8 w-auto" />
		</div>
	</header>

	<main class="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 sm:px-6">
		{#if data.hasToken}
			<div class="text-center">
				<h1 class="text-2xl font-bold tracking-tight text-ink">Set a new password</h1>
				<p class="mt-2 text-sm leading-relaxed text-ink-secondary">
					Choose something you haven't used here before.
				</p>
			</div>

			<form
				method="POST"
				class="mt-7 flex flex-col gap-4"
				use:enhance={() => {
					submitting = true;
					return async ({ update }) => {
						await update();
						submitting = false;
					};
				}}
			>
				{#if form?.message}
					<Alert>{form.message}</Alert>
				{/if}

				<input type="hidden" name="token" value={token} />

				<Input
					label="New password"
					type="password"
					name="password"
					placeholder="At least {data.minPasswordLength} characters"
					autocomplete="new-password"
					minlength={data.minPasswordLength}
					required
				/>
				<Input
					label="Confirm new password"
					type="password"
					name="confirm"
					placeholder="Type it again"
					autocomplete="new-password"
					minlength={data.minPasswordLength}
					required
				/>

				<Button variant="primary" size="lg" fullWidth type="submit" disabled={submitting}>
					{submitting ? 'Saving…' : 'Save new password'}
				</Button>
			</form>
		{:else}
			<!-- No token, or Better Auth bounced us here with one it rejected. Both
			     are the same dead end for the person reading it, and both are fixed
			     the same way. -->
			<div class="text-center">
				<h1 class="text-2xl font-bold tracking-tight text-ink">That link doesn't work</h1>
				<p class="mt-2 text-sm leading-relaxed text-ink-secondary">
					{data.message ?? 'Reset links expire after an hour, and each one works only once.'}
				</p>
			</div>

			<div class="mt-7 flex flex-col gap-3">
				<Button variant="primary" size="lg" fullWidth onclick={() => goto('/auth?mode=reset')}>
					Request a new link
				</Button>
			</div>
		{/if}

		<a
			href="/auth"
			class="mt-6 text-center text-sm font-semibold text-primary underline-offset-2 hover:underline"
		>
			Back to sign in
		</a>
	</main>
</div>
