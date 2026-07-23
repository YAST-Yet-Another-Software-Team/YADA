<script lang="ts">
	import BrandLogo from '$lib/components/BrandLogo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { onMount } from 'svelte';
	import { auth } from '$lib/stores/auth';

	const bypassKey = 'yada-auth-bypass';

	let fullName = '';
	let phone = '';
	let email = '';
	let password = '';
	let errorMessage = '';
	let isLoading = true;

	$: canContinue =
		fullName.trim().length > 1 &&
		phone.trim().length > 6 &&
		email.trim().includes('@') &&
		password.trim().length >= 6;

	onMount(async () => {
		try {
			if (window.localStorage.getItem(bypassKey) === 'true') {
				isLoading = false;
				window.location.replace('/courier/home');
				return;
			}

			const session = await auth.syncSession();
			if (session) {
				window.location.replace('/courier/home');
			}
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to start Better Auth.';
		} finally {
			isLoading = false;
		}
	});

	function continueAuth() {
		if (!canContinue) return;
		void auth.signUp(email, password, fullName, phone).then(() => window.location.replace('/courier/home'));
	}

	function bypassAuth() {
		if (typeof window !== 'undefined') {
			window.localStorage.setItem(bypassKey, 'true');
		}
		window.location.replace('/courier/home');
	}

	function clearBypass() {
		if (typeof window !== 'undefined') {
			window.localStorage.removeItem(bypassKey);
		}
		errorMessage = '';
	}
</script>

<svelte:head>
	<title>Courier sign in | YADA</title>
</svelte:head>

<div class="relative flex min-h-svh items-center justify-center overflow-hidden bg-bg px-6 py-10">
	<div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(239,68,68,0.12),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.12),_transparent_28%)]"></div>
	<div class="relative w-full max-w-md rounded-3xl border border-border bg-surface/90 p-8 shadow-xl backdrop-blur">
		<BrandLogo href="/courier/auth" size="md" />
		<p class="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-ink-tertiary">
			Courier access
		</p>
		<h1 class="mt-3 text-3xl font-semibold text-ink">Sign in to accept deliveries.</h1>
		<p class="mt-3 text-base leading-relaxed text-ink-secondary">
			Use Better Auth to create your courier account and continue on the road.
		</p>

		<div class="mt-8 rounded-2xl border border-border bg-bg p-5">
			<p class="text-xs font-semibold uppercase tracking-[0.16em] text-ink-tertiary">Better Auth flow</p>
			<p class="mt-2 text-sm text-ink-secondary">
				The server handles login, session state, and account creation for the courier app.
			</p>
		</div>

		<div class="mt-6 flex flex-col gap-4">
			<Input label="Full name" placeholder="Kwame Asante" bind:value={fullName} />
			<Input label="Phone number" type="tel" placeholder="(555) 000-0000" bind:value={phone} />
			<Input label="Email" type="email" placeholder="rider@email.com" bind:value={email} />
			<Input label="Password" type="password" placeholder="At least 6 characters" bind:value={password} />
		</div>

		<div class="mt-6">
			<div class="grid gap-3 sm:grid-cols-2">
				<Button variant="primary" size="lg" fullWidth on:click={continueAuth} disabled={isLoading || !canContinue}>
					Create courier account
				</Button>
				<Button variant="secondary" size="lg" fullWidth on:click={bypassAuth}>
					Test bypass
				</Button>
			</div>

			<div class="mt-4 flex justify-center">
				<button
					type="button"
					class="text-xs font-medium text-ink-tertiary underline-offset-4 hover:text-ink-secondary hover:underline"
					on:click={clearBypass}
				>
					Clear test bypass
				</button>
			</div>
		</div>

		{#if errorMessage}
			<p class="mt-4 text-sm text-secondary">{errorMessage}</p>
		{/if}

		<p class="mt-4 text-center text-xs text-ink-tertiary">
			Courier identity is handled by Better Auth; no external redirect is required.
		</p>
	</div>
</div>
