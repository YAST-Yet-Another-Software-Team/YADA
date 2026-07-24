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
	let rememberMe = false;
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

	const dotGrid = Array.from({ length: 20 });
</script>

<svelte:head>
	<title>Sign in | YADA</title>
	<meta name="description" content="Sign in to YADA." />
</svelte:head>

<div class="min-h-svh bg-surface-sunken px-4 py-4 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
	<div class="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl items-center justify-center">
		<div class="grid w-full grid-cols-1 overflow-hidden rounded-[28px] border border-border bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.06),0_24px_60px_-20px_rgba(15,23,42,0.25)] lg:grid-cols-[1fr_1fr]">

			<!-- Desktop-only color panel -->
			<section class="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 lg:flex">
				<!-- top-left dot grid -->
				<div class="absolute left-8 top-8 grid grid-cols-5 gap-2.5">
					{#each dotGrid as _}
						<span class="h-1.5 w-1.5 rounded-full bg-white/35"></span>
					{/each}
				</div>

				<!-- delivery pin cluster, top-right -->
				<div class="absolute right-10 top-10 flex items-end gap-3">
					<span class="h-10 w-10 rounded-full border-2 border-white/60"></span>
					<span class="mb-1 h-3 w-3 rounded-full bg-white"></span>
					<span class="h-6 w-6 rounded-full bg-secondary"></span>
				</div>

				<div class="relative z-10 mt-16">
					<p class="font-mono text-xs uppercase tracking-[0.2em] text-white/70">YADA for teams</p>
					<h1 class="mt-4 max-w-xs text-4xl font-bold leading-[1.1] tracking-tight text-white">
						Every delivery,<br />on time.
					</h1>
					<p class="mt-4 max-w-xs text-sm leading-6 text-white/80">
						Sign in to manage orders, track couriers, and keep customers in the loop.
					</p>
				</div>

				<!-- route/tracking motif, bottom -->
				<div class="relative z-10 mt-10 flex items-center gap-4">
					<div class="relative h-24 w-24 shrink-0">
						<span class="absolute inset-0 rounded-full border-2 border-dashed border-white/40"></span>
						<span class="absolute bottom-1 left-1 h-12 w-12 rounded-full bg-secondary"></span>
						<span class="absolute right-0 top-0 h-4 w-4 rounded-full bg-white"></span>
					</div>
					<div class="grid grid-cols-4 gap-2.5">
						{#each Array.from({ length: 12 }) as _}
							<span class="h-1.5 w-1.5 rounded-full bg-white/35"></span>
						{/each}
					</div>
				</div>
			</section>

			<!-- Auth form -->
			<section class="flex items-center justify-center p-6 sm:p-8 lg:p-12">
				<div class="w-full max-w-sm">
					<div class="flex flex-col items-center text-center">
						<div class="rounded-2xl bg-surface p-3 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_20px_-8px_rgba(15,23,42,0.25)]">
							<BrandLogo href="/" size="md" />
						</div>
						<h2 class="mt-5 text-2xl font-semibold tracking-tight text-ink">
							{mode === 'sign-up' ? 'Create your account' : 'Hello! Welcome back'}
						</h2>
						<p class="mt-1.5 text-sm leading-6 text-ink-secondary">
							{mode === 'sign-up'
								? 'Choose how you use YADA to get started.'
								: 'Sign in to continue your dispatch workflow.'}
						</p>
					</div>

					<form class="mt-7 flex flex-col gap-4" on:submit|preventDefault={submitAuth}>
						{#if mode === 'sign-up'}
							<div class="grid grid-cols-2 gap-2 rounded-full border border-border bg-surface-sunken p-1">
								<button
									type="button"
									class="rounded-full px-3 py-2 text-sm font-medium transition {role === 'business'
										? 'bg-primary text-primary-on shadow-sm'
										: 'text-ink-secondary hover:text-ink'}"
									on:click={() => (role = 'business')}
								>
									Business
								</button>
								<button
									type="button"
									class="rounded-full px-3 py-2 text-sm font-medium transition {role === 'courier'
										? 'bg-primary text-primary-on shadow-sm'
										: 'text-ink-secondary hover:text-ink'}"
									on:click={() => (role = 'courier')}
								>
									Courier
								</button>
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
							placeholder="Enter your email address"
							bind:value={email}
						/>
						<Input label="Password" type="password" placeholder="Enter your password" bind:value={password} />

						{#if mode === 'sign-in'}
							<div class="flex items-center justify-between text-sm">
								<label class="flex items-center gap-2 text-ink-secondary">
									<input type="checkbox" bind:checked={rememberMe} class="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
									Remember me
								</label>
								<button type="button" class="font-medium text-primary hover:underline">
									Forgot password?
								</button>
							</div>
						{/if}

						<Button
							variant="primary"
							size="lg"
							fullWidth
							type="submit"
							disabled={isLoading || isSubmitting || !canSubmit}
						>
							{mode === 'sign-up' ? 'Create account' : 'Login'}
						</Button>

						<div class="flex items-center justify-center gap-2 text-sm text-ink-secondary">
							<span>{mode === 'sign-up' ? 'Already have an account?' : "Don't have an account?"}</span>
							<button
								type="button"
								class="font-semibold text-primary underline-offset-2 hover:underline"
								on:click={() => {
									mode = mode === 'sign-up' ? 'sign-in' : 'sign-up';
								}}
							>
								{mode === 'sign-up' ? 'Sign in' : 'Create account'}
							</button>
						</div>
					</form>

					<p class="mt-6 text-center text-xs leading-6 text-ink-tertiary">
						No payment info needed — YADA only locates and tracks riders.
					</p>
				</div>
			</section>
		</div>
	</div>
</div>