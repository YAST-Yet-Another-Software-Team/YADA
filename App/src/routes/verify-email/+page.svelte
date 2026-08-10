<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import Alert from '$lib/components/Alert.svelte';
	import Button from '$lib/components/Button.svelte';

	let { data, form } = $props();

	let submitting = $state(false);

	/**
	 * The session says more than the query does. A link clicked twice comes
	 * back as a bare success — Better Auth redirects without complaint once the
	 * address is already confirmed — so "you're confirmed" is read off the
	 * account, and the query only decides whether to celebrate.
	 */
	const confirmed = $derived(data.state === 'success' || data.verified);

	const heading = $derived(
		confirmed
			? 'Your email is confirmed'
			: data.state === 'failed'
				? "That link doesn't work"
				: 'Confirm your email'
	);

	const workspace = $derived(data.role === 'courier' ? '/home' : '/dashboard');
</script>

<svelte:head>
	<title>Confirm your email | YADA</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="flex min-h-svh flex-col bg-surface">
	<header class="shrink-0">
		<div class="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
			<img src="/logo.svg" alt="YADA" class="h-8 w-auto" />
		</div>
	</header>

	<main class="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 sm:px-6">
		<div class="text-center">
			<h1 class="text-2xl font-bold tracking-tight text-ink">{heading}</h1>
			<p class="mt-2 text-sm leading-relaxed text-ink-secondary">
				{#if confirmed}
					Everything is open to you now — thanks for confirming.
				{:else if data.state === 'failed'}
					{data.message ?? 'Confirmation links expire after a day.'} Send yourself a fresh one below.
				{:else if data.email}
					We sent a link to <span class="font-semibold text-ink">{data.email}</span>. Click it and
					you're done.
				{:else}
					Sign in and we'll send a confirmation link to the address on your account.
				{/if}
			</p>
		</div>

		<div class="mt-7 flex flex-col gap-3">
			{#if confirmed}
				<Button variant="primary" size="lg" fullWidth onclick={() => goto(workspace)}>
					Continue
				</Button>
			{:else if data.signedIn}
				<form
					method="POST"
					action="?/resend"
					use:enhance={() => {
						submitting = true;
						return async ({ update }) => {
							await update({ reset: false });
							submitting = false;
						};
					}}
					class="flex flex-col gap-3"
				>
					{#if form?.message}
						<!-- The already-confirmed case is good news, not a failure. -->
						<Alert variant={form.sent === false ? 'success' : 'danger'}>{form.message}</Alert>
					{:else if form?.sent}
						<Alert variant="success">
							Sent. Check your inbox — and your spam folder, just in case.
						</Alert>
					{/if}

					<Button variant="primary" size="lg" fullWidth type="submit" disabled={submitting}>
						{submitting ? 'Sending…' : 'Send a new link'}
					</Button>
				</form>

				<Button variant="neutral" size="lg" fullWidth onclick={() => goto(workspace)}>
					Skip for now
				</Button>
			{:else}
				<Button variant="primary" size="lg" fullWidth onclick={() => goto('/auth')}>
					Sign in
				</Button>
			{/if}
		</div>
	</main>
</div>
