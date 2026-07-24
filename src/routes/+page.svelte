<script lang="ts">
	import BrandLogo from '$lib/components/BrandLogo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { auth } from '$lib/stores/auth';
	import { onMount } from 'svelte';

	type Role = 'business' | 'courier';
	type Mode = 'sign-in' | 'sign-up';

	let mode: Mode = 'sign-in';
	let role: Role = 'business';
	let name = '';
	let phone = '';
	let email = '';
	let password = '';
	let isLoading = true;
	let isSubmitting = false;

	function destinationFor(userRole: string | null | undefined) {
		return userRole === 'courier' ? '/courier/home' : '/dashboard';
	}

	onMount(async () => {
		try {
			const session = await auth.syncSession();
			if (session) {
				window.location.replace(destinationFor(session.role));
				return;
			}
		} catch {
			// Stay on sign-in if session check fails.
		} finally {
			isLoading = false;
		}
	});

	async function submitAuth() {
		if (isSubmitting || isLoading) return;
		isSubmitting = true;

		try {
			if (mode === 'sign-up') {
				const displayName =
					name.trim() ||
					(role === 'business' ? email.split('@')[0] || 'Business user' : 'Courier');
				await auth.signUp(
					email,
					password,
					displayName,
					role === 'courier' ? phone : undefined
				);
				// Prefer selected signup role for first landing; session role used on later logins.
				window.location.replace(destinationFor(role));
				return;
			}

			const user = await auth.signIn(email, password);
			window.location.replace(destinationFor(user?.role));
		} catch {
			// Keep the page calm — no technical error text.
		} finally {
			isSubmitting = false;
		}
	}

	$: canSubmit =
		email.trim().includes('@') &&
		password.trim().length >= 6 &&
		(mode === 'sign-in' ||
			(name.trim().length > 1 && (role === 'business' || phone.trim().length > 6)));
</script>

<svelte:head>
	<title>Sign in | YADA</title>
	<meta name="description" content="Sign in to YADA." />
</svelte:head>

<div class="flex min-h-svh flex-col items-center justify-center bg-bg px-6 py-12">
	<div class="w-full max-w-md">
		<div class="mb-8 text-center">
			<div class="flex justify-center">
				<BrandLogo href="/" size="md" />
			</div>
			<h1 class="mt-4 text-2xl font-semibold text-ink">
				{mode === 'sign-up' ? 'Create your account' : 'Welcome back'}
			</h1>
			<p class="mt-2 text-base text-ink-secondary">
				{mode === 'sign-up'
					? 'Choose how you use YADA, then set up your account.'
					: 'Sign in to continue.'}
			</p>
		</div>

		<form
			class="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6 shadow-sm sm:p-8"
			on:submit|preventDefault={submitAuth}
		>
			{#if mode === 'sign-up'}
				<div>
					<div class="grid grid-cols-2 gap-2 rounded-md bg-surface-sunken p-1">
						<button
							type="button"
							class="rounded-sm px-3 py-2.5 text-sm font-semibold transition {role === 'business'
								? 'bg-surface text-ink shadow-xs'
								: 'text-ink-secondary hover:text-ink'}"
							on:click={() => (role = 'business')}
						>
							Business
						</button>
						<button
							type="button"
							class="rounded-sm px-3 py-2.5 text-sm font-semibold transition {role === 'courier'
								? 'bg-surface text-ink shadow-xs'
								: 'text-ink-secondary hover:text-ink'}"
							on:click={() => (role = 'courier')}
						>
							Courier
						</button>
					</div>
				</div>

				{#if role === 'business'}
					<Input label="Business name" type="text" placeholder="Favorie Kitchen" bind:value={name} />
				{:else}
					<Input label="Full name" type="text" placeholder="Kwame Asante" bind:value={name} />
					<Input label="Phone number" type="tel" placeholder="(555) 000-0000" bind:value={phone} />
				{/if}
			{/if}

			<Input
				label={mode === 'sign-up' && role === 'business' ? 'Work email' : 'Email'}
				type="email"
				placeholder={mode === 'sign-up' && role === 'business'
					? 'name@restaurant.com'
					: 'you@email.com'}
				bind:value={email}
			/>
			<Input label="Password" type="password" placeholder="••••••••" bind:value={password} />

			<Button
				variant="primary"
				size="lg"
				fullWidth
				type="submit"
				disabled={isLoading || isSubmitting || !canSubmit}
			>
				{mode === 'sign-up' ? 'Create account' : 'Sign in'}
			</Button>

			<div class="flex items-center justify-center gap-2 text-sm text-ink-secondary">
				<span>{mode === 'sign-up' ? 'Already have an account?' : 'Need an account?'}</span>
				<button
					type="button"
					class="font-semibold text-primary underline-offset-2 hover:underline"
					on:click={() => {
						mode = mode === 'sign-up' ? 'sign-in' : 'sign-up';
					}}
				>
					{mode === 'sign-up' ? 'Sign in' : 'Create one'}
				</button>
			</div>
		</form>

					<p class="mt-4 text-center text-xs leading-6 text-ink-tertiary lg:mt-6">
					
					</p>
				</div>
			</section>
		</div>
		<p class="mt-6 text-center text-xs text-ink-tertiary">
			No payment info needed — YADA only locates and tracks riders.
		</p>
	</div>
</div>
