<script lang="ts">
	import BrandLogo from '$lib/components/BrandLogo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { auth } from '$lib/stores/auth';
	import { onMount } from 'svelte';

	let email = '';
	let password = '';
	let keepMeSignedIn = true;
	let errorMessage = '';
	let isLoading = true;

	onMount(async () => {
		try {
			const session = await auth.syncSession();
			if (session) {
				window.location.replace('/dashboard');
			}
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to start Auth0.';
		} finally {
			isLoading = false;
		}
	});

	function login() {
		void auth.signIn(email, password).then(() => window.location.replace('/dashboard'));
	}
</script>

<svelte:head>
	<title>Log in | YADA Business</title>
</svelte:head>

<div class="relative min-h-svh overflow-hidden bg-bg px-6 py-10">
	<div class="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.12),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.12),_transparent_28%)]"></div>
	<div class="relative mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-6xl items-center">
		<div class="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
			<section class="rounded-3xl border border-border bg-surface/90 p-8 shadow-xl backdrop-blur">
				<BrandLogo href="/auth" size="md" />
				<p class="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-ink-tertiary">
					Business access
				</p>
				<h1 class="mt-3 max-w-xl text-4xl font-semibold leading-tight text-ink">
					Sign in with Auth0 to request and track couriers.
				</h1>
				<p class="mt-4 max-w-lg text-base leading-relaxed text-ink-secondary">
					Use the Better Auth flow for secure login, then return straight to the dispatch dashboard.
				</p>

				<div class="mt-8 flex flex-wrap gap-3 text-sm text-ink-secondary">
					<span class="rounded-full border border-border bg-bg px-3 py-1.5">Server-backed login</span>
					<span class="rounded-full border border-border bg-bg px-3 py-1.5">Svelte store state</span>
					<span class="rounded-full border border-border bg-bg px-3 py-1.5">Session cookie</span>
				</div>
			</section>

			<section class="flex items-center rounded-3xl border border-border bg-surface p-8 shadow-xl">
				<div class="w-full">
					<div class="mb-6 rounded-2xl bg-primary-subtle p-5 text-primary">
						<p class="text-xs font-semibold uppercase tracking-[0.16em]">Powered by Better Auth</p>
						<p class="mt-2 text-sm text-ink-secondary">
							Configure BETTER_AUTH_SECRET and your database to enable login.
						</p>
					</div>

					<div class="flex flex-col gap-4">
						<Input label="Work email" type="email" placeholder="name@restaurant.com" bind:value={email} />
						<Input label="Password" type="password" placeholder="••••••••" bind:value={password} />
					</div>

					<div class="mt-6">
						<Button variant="primary" size="lg" fullWidth on:click={login} disabled={isLoading}>
							Continue with Better Auth
					</Button>
					</div>

					{#if errorMessage}
						<p class="mt-4 text-sm text-secondary">{errorMessage}</p>
					{/if}

					<p class="mt-4 text-center text-xs text-ink-tertiary">
						Passwords are handled by Better Auth on the server.
					</p>
				</div>
			</section>
		</div>
	</div>
</div>
