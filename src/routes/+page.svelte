<script lang="ts">
	import BrandLogo from '$lib/components/BrandLogo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { auth } from '$lib/stores/auth';
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';

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

	// Forgot-password mini flow
	let showForgotPassword = false;
	let resetEmail = '';
	let resetSent = false;
	let isResetting = false;

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

			const user = await auth.signIn(email, password, rememberMe);
			window.location.replace(destinationFor(user?.role));
		} catch {
			// Keep the page calm — no technical error text.
		} finally {
			isSubmitting = false;
		}
	}

	function openForgotPassword() {
		resetEmail = email;
		resetSent = false;
		showForgotPassword = true;
	}

	function closeForgotPassword() {
		showForgotPassword = false;
		resetSent = false;
	}

	async function requestReset() {
		if (isResetting || !resetEmail.trim().includes('@')) return;
		isResetting = true;
		try {
			await auth.requestPasswordReset(resetEmail.trim());
			resetSent = true;
		} catch {
			resetSent = false;
		} finally {
			isResetting = false;
		}
	}

	$: canSubmit =
		email.trim().includes('@') &&
		password.trim().length >= 6 &&
		(mode === 'sign-in' ||
			(name.trim().length > 1 && (role === 'business' || phone.trim().length > 6)));

	$: canRequestReset = resetEmail.trim().includes('@');

	const dotGrid = Array.from({ length: 20 });
	const miniDotGrid = Array.from({ length: 12 });
</script>

<svelte:head>
	<title>Sign in | YADA</title>
	<meta name="description" content="Sign in to YADA." />
</svelte:head>

<div class="min-h-svh bg-surface-sunken lg:px-8 lg:py-10">
	<div class="mx-auto flex min-h-svh max-w-6xl items-stretch justify-center lg:min-h-[calc(100vh-2rem)] lg:items-center">
		<div class="grid w-full grid-cols-1 overflow-hidden bg-surface lg:grid-cols-[1fr_1fr] lg:rounded-[28px] lg:border lg:border-border lg:shadow-[0_1px_2px_rgba(15,23,42,0.06),0_24px_60px_-20px_rgba(15,23,42,0.25)]">

			<!-- Mobile-only compact brand band -->
			<section class="relative flex shrink-0 items-center justify-between overflow-hidden bg-primary px-5 py-4 lg:hidden">
				<div class="pointer-events-none absolute -right-3 -top-3 grid grid-cols-4 gap-1.5 opacity-30">
					{#each miniDotGrid as _}
						<span class="h-1 w-1 rounded-full bg-white"></span>
					{/each}
				</div>

				<div class="relative z-10 rounded-lg bg-surface p-1.5 shadow-sm">
					<BrandLogo href="/" size="sm" />
				</div>

				<div class="relative z-10 flex items-center gap-3">
					<div class="relative h-px w-12 border-t-2 border-dashed border-white/40">
						<span class="absolute -top-[5px] h-2.5 w-2.5 rounded-full bg-white travel-shape"></span>
					</div>
					<div class="relative float-shape">
						<div class="relative h-7 w-7 rounded-md border-2 border-white/70">
							<span class="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/70"></span>
							<span class="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/70"></span>
						</div>
						<span class="absolute -bottom-1 -right-1 h-2 w-2 rounded-full bg-secondary pulse-shape"></span>
					</div>
				</div>
			</section>

			<!-- Desktop-only color panel -->
			<section class="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 lg:flex">
				<!-- top-left dot grid -->
				<div class="absolute left-8 top-8 grid grid-cols-5 gap-2.5">
					{#each dotGrid as _}
						<span class="h-1.5 w-1.5 rounded-full bg-white/35"></span>
					{/each}
				</div>

				<!-- floating parcel icon, top-right -->
				<div class="absolute right-10 top-10 float-shape">
					<div class="relative h-14 w-14 rounded-lg border-2 border-white/70">
						<span class="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/70"></span>
						<span class="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/70"></span>
					</div>
					<span class="absolute -bottom-2 -right-2 h-4 w-4 rounded-full bg-secondary pulse-shape"></span>
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

				<!-- traveling courier dot along a dashed route -->
				<div class="relative z-10 mt-10 h-px w-full border-t-2 border-dashed border-white/35">
					<span class="absolute -top-[5px] h-2.5 w-2.5 rounded-full bg-white travel-shape"></span>
				</div>

				<!-- route/tracking motif, bottom -->
				<div class="relative z-10 mt-8 flex items-center gap-4">
					<div class="relative h-24 w-24 shrink-0">
						<span class="absolute inset-0 spin-shape rounded-full border-2 border-dashed border-white/40"></span>
						<span class="absolute bottom-1 left-1 h-12 w-12 rounded-full bg-secondary pulse-shape"></span>
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
			<section class="flex flex-col justify-center p-5 sm:p-6 lg:items-center lg:p-12">
				<div class="mx-auto w-full max-w-sm">
					<div class="flex flex-col items-center text-center">
						<div class="hidden rounded-2xl bg-surface p-3 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_20px_-8px_rgba(15,23,42,0.25)] lg:block">
							<BrandLogo href="/" size="md" />
						</div>
						<h2 class="mt-3 text-xl font-semibold tracking-tight text-ink lg:mt-5 lg:text-2xl">
							{#if showForgotPassword}
								{resetSent ? 'Check your email' : 'Reset your password'}
							{:else}
								{mode === 'sign-up' ? 'Create your account' : 'Hello! Welcome back'}
							{/if}
						</h2>
						<p class="mt-1 text-sm leading-6 text-ink-secondary lg:mt-1.5">
							{#if showForgotPassword}
								{resetSent
									? `If an account exists for ${resetEmail}, we've sent a reset link.`
									: "Enter the email linked to your account and we'll send you a reset link."}
							{:else}
								{mode === 'sign-up'
									? 'Choose how you use YADA to get started.'
									: 'Sign in to continue your dispatch workflow.'}
							{/if}
						</p>
					</div>

					{#if showForgotPassword}
						<div class="mt-5 flex flex-col gap-3 lg:mt-7 lg:gap-4" transition:slide={{ duration: 220 }}>
							{#if !resetSent}
								<Input label="Email" type="email" placeholder="Enter your email address" bind:value={resetEmail} />
								<Button
									variant="primary"
									size="lg"
									fullWidth
									type="button"
									disabled={isResetting || !canRequestReset}
									on:click={requestReset}
								>
									{isResetting ? 'Sending…' : 'Send reset link'}
								</Button>
							{/if}

							<button
								type="button"
								class="text-center text-sm font-semibold text-primary underline-offset-2 hover:underline"
								on:click={closeForgotPassword}
							>
								Back to sign in
							</button>
						</div>
					{:else}
						<form class="mt-5 flex flex-col gap-3 lg:mt-7 lg:gap-4" on:submit|preventDefault={submitAuth} transition:slide={{ duration: 220 }}>
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
									<button type="button" class="font-medium text-primary hover:underline" on:click={openForgotPassword}>
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
					{/if}

					<p class="mt-4 text-center text-xs leading-6 text-ink-tertiary lg:mt-6">
					
					</p>
				</div>
			</section>
		</div>
	</div>
</div>

<style>
	.float-shape {
		animation: float 3.2s ease-in-out infinite;
	}
	.pulse-shape {
		animation: pulse-scale 2.4s ease-in-out infinite;
	}
	.spin-shape {
		animation: spin-slow 9s linear infinite;
	}
	.travel-shape {
		animation: travel 4s ease-in-out infinite;
	}

	@keyframes float {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-6px); }
	}
	@keyframes pulse-scale {
		0%, 100% { transform: scale(1); opacity: 1; }
		50% { transform: scale(1.15); opacity: 0.75; }
	}
	@keyframes spin-slow {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
	@keyframes travel {
		0% { left: 0%; }
		50% { left: calc(100% - 10px); }
		100% { left: 0%; }
	}

	@media (prefers-reduced-motion: reduce) {
		.float-shape,
		.pulse-shape,
		.spin-shape,
		.travel-shape {
			animation: none !important;
		}
	}
</style>