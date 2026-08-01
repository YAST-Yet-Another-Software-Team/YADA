<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import LocationPickerMap from '$lib/components/ui/LocationPickerMap.svelte';
	import { KUMASI_CENTER } from '$lib/shared/geo/service-area';
	import type { LatLng } from '$lib/utils/types';
	import { slide } from 'svelte/transition';

	type Role = 'business' | 'courier';
	type Mode = 'sign-in' | 'sign-up' | 'reset';

	/** Whatever the last `fail()` from an action returned, or `{ sent: true }`. */
	let {
		form
	}: {
		form: {
			message?: string;
			email?: string;
			name?: string;
			phone?: string;
			role?: string;
			sent?: boolean;
		} | null;
	} = $props();

	// Which panel is on screen lives in the URL, not in component state, so the
	// mode toggle is an ordinary link. That keeps it working with JavaScript off
	// and makes ?mode=sign-up&role=courier from the landing page the same
	// mechanism rather than a special case read once at init.
	const mode = $derived<Mode>(
		page.url.searchParams.get('mode') === 'sign-up'
			? 'sign-up'
			: page.url.searchParams.get('mode') === 'reset'
				? 'reset'
				: 'sign-in'
	);

	// Role is a radio inside the form: `bind:group` drives the phone field's
	// visibility here, and the same input submits the value to the action.
	let role = $state<Role>(
		page.url.searchParams.get('role') === 'courier' ? 'courier' : 'business'
	);

	$effect(() => {
		if (form?.role === 'courier' || form?.role === 'business') role = form.role;
	});

	// A business is stationary, so its address is captured once, here, and every
	// later request departs from it. The pin is the input and the address is what
	// Google calls that pin — the reverse of the autocomplete this replaced, which
	// could only ever guess a coordinate from a name.
	//
	// Not seeded from `form`: a rejected sign-up re-renders this component rather
	// than remounting it, so the pin the visitor already dropped is still here.
	let businessPoint = $state<LatLng | null>(null);
	let businessAddress = $state('');
	let addressError = $state('');

	let submitting = $state(false);

	/** Flip the pending flag around the request; `update()` applies the result. */
	const track = () => {
		submitting = true;

		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			submitting = false;
		};
	};

	/** Better Auth's default `minPasswordLength`, mirrored from the action so the
	 *  hint matches what the server will actually accept. */
	const MIN_PASSWORD_LENGTH = 8;

	const dotGrid = Array.from({ length: 20 });
	const miniDotGrid = Array.from({ length: 12 });
</script>

<svelte:head>
	<title>Sign in | YADA</title>
	<meta name="description" content="Sign in to YADA." />
</svelte:head>

<div class="min-h-svh bg-surface-sunken lg:px-8 lg:py-10">
	<div class="mx-auto flex min-h-svh max-w-6xl items-stretch justify-center lg:min-h-[calc(100vh-2rem)] lg:items-center">
		<div class="grid w-full grid-cols-1 overflow-hidden bg-surface lg:grid-cols-[1fr_1fr] lg:rounded-xl lg:border lg:border-border lg:shadow-lg">

			<!-- Mobile-only compact brand band -->
			<section class="relative flex shrink-0 items-center justify-between overflow-hidden bg-primary px-5 py-4 lg:hidden">
				<div class="pointer-events-none absolute -right-3 -top-3 grid grid-cols-4 gap-1.5 opacity-30">
					{#each miniDotGrid as _}
						<span class="h-1 w-1 rounded-full bg-primary-on"></span>
					{/each}
				</div>

				<a
					href="/"
					class="relative z-10 inline-flex rounded-lg bg-surface p-1.5 shadow-sm"
					aria-label="YADA home"
				>
					<img src="/logo.svg" alt="" class="h-8 w-auto" />
				</a>

				<div class="relative z-10 flex items-center gap-3">
					<div class="relative h-px w-12 border-t-2 border-dashed border-primary-on/40">
						<span class="absolute -top-[5px] h-2.5 w-2.5 rounded-full bg-primary-on travel-shape"></span>
					</div>
					<div class="relative float-shape">
						<div class="relative h-7 w-7 rounded-md border-2 border-primary-on/70">
							<span class="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-primary-on/70"></span>
							<span class="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-primary-on/70"></span>
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
						<span class="h-1.5 w-1.5 rounded-full bg-primary-on/35"></span>
					{/each}
				</div>

				<!-- floating parcel icon, top-right -->
				<div class="absolute right-10 top-10 float-shape">
					<div class="relative h-14 w-14 rounded-lg border-2 border-primary-on/70">
						<span class="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-primary-on/70"></span>
						<span class="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-primary-on/70"></span>
					</div>
					<span class="absolute -bottom-2 -right-2 h-4 w-4 rounded-full bg-secondary pulse-shape"></span>
				</div>

				<div class="relative z-10 mt-16">
					<p class="text-eyebrow font-mono text-primary-on/70">YADA for teams</p>
					<h1 class="mt-4 max-w-xs text-4xl font-bold leading-tight tracking-tight text-primary-on">
						Every delivery,<br />on time.
					</h1>
					<p class="mt-4 max-w-xs text-sm leading-relaxed text-primary-on/80">
						Sign in to manage orders, track couriers, and keep customers in the loop.
					</p>
				</div>

				<!-- traveling courier dot along a dashed route -->
				<div class="relative z-10 mt-10 h-px w-full border-t-2 border-dashed border-primary-on/35">
					<span class="absolute -top-[5px] h-2.5 w-2.5 rounded-full bg-primary-on travel-shape"></span>
				</div>

				<!-- route/tracking motif, bottom -->
				<div class="relative z-10 mt-8 flex items-center gap-4">
					<div class="relative h-24 w-24 shrink-0">
						<span class="absolute inset-0 spin-shape rounded-full border-2 border-dashed border-primary-on/40"></span>
						<span class="absolute bottom-1 left-1 h-12 w-12 rounded-full bg-secondary pulse-shape"></span>
						<span class="absolute right-0 top-0 h-4 w-4 rounded-full bg-primary-on"></span>
					</div>
					<div class="grid grid-cols-4 gap-2.5">
						{#each Array.from({ length: 12 }) as _}
							<span class="h-1.5 w-1.5 rounded-full bg-primary-on/35"></span>
						{/each}
					</div>
				</div>
			</section>

			<!-- Auth form -->
			<section class="flex flex-col justify-center p-5 sm:p-6 lg:items-center lg:p-12">
				<div class="mx-auto w-full max-w-sm">
					<div class="flex flex-col items-center text-center">
						<a
							href="/"
							class="hidden rounded-lg bg-surface p-3 shadow-md lg:inline-flex"
							aria-label="YADA home"
						>
							<img src="/logo.svg" alt="" class="h-14 w-auto" />
						</a>
						<h2 class="mt-3 text-xl font-semibold tracking-tight text-ink lg:mt-5 lg:text-2xl">
							{#if mode === 'reset'}
								{form?.sent ? 'Check your email' : 'Reset your password'}
							{:else}
								{mode === 'sign-up' ? 'Create your account' : 'Hello! Welcome back'}
							{/if}
						</h2>
						<p class="mt-1 text-sm leading-relaxed text-ink-secondary lg:mt-1.5">
							{#if mode === 'reset'}
								{form?.sent
									? `If an account exists for ${form.email}, we've sent a reset link.`
									: "Enter the email linked to your account and we'll send you a reset link."}
							{:else}
								{mode === 'sign-up'
									? 'Choose how you use YADA to get started.'
									: 'Sign in to pick up where you left off.'}
							{/if}
						</p>
					</div>

					{#if mode === 'reset'}
						<form
							method="POST"
							action="?/reset"
							use:enhance={track}
							class="mt-5 flex flex-col gap-3 lg:mt-7 lg:gap-4"
							transition:slide={{ duration: 220 }}
						>
							{#if form?.message}
								<Alert>{form.message}</Alert>
							{/if}

							{#if !form?.sent}
								<Input
									label="Email"
									type="email"
									name="email"
									placeholder="Enter your email address"
									autocomplete="email"
									required
									value={form?.email ?? ''}
								/>
								<Button variant="primary" size="lg" fullWidth type="submit" disabled={submitting}>
									{submitting ? 'Sending…' : 'Send reset link'}
								</Button>
							{/if}

							<a
								href="/auth"
								class="text-center text-sm font-semibold text-primary underline-offset-2 hover:underline"
							>
								Back to sign in
							</a>
						</form>
					{:else}
						<form
							method="POST"
							action={mode === 'sign-up' ? '?/signup' : '?/signin'}
							use:enhance={track}
							class="mt-5 flex flex-col gap-3 lg:mt-7 lg:gap-4"
							transition:slide={{ duration: 220 }}
						>
							{#if form?.message}
								<Alert>{form.message}</Alert>
							{/if}

							{#if mode === 'sign-up'}
								<!-- Radios, not buttons: `bind:group` shows the right fields here and
								     the same input carries the role to the action. -->
								<fieldset class="grid grid-cols-2 gap-2 rounded-full border border-border bg-surface-sunken p-1">
									<legend class="sr-only">I am signing up as</legend>
									{#each [{ value: 'business', label: 'Business' }, { value: 'courier', label: 'Courier' }] as option}
										<label
											class="cursor-pointer rounded-full px-3 py-2 text-center text-sm font-medium transition {role ===
											option.value
												? 'bg-primary text-primary-on shadow-sm'
												: 'text-ink-secondary hover:text-ink'}"
										>
											<input
												type="radio"
												name="role"
												value={option.value}
												bind:group={role}
												class="sr-only"
											/>
											{option.label}
										</label>
									{/each}
								</fieldset>

								{#if role === 'business'}
									<Input
										label="Business name"
										type="text"
										name="name"
										placeholder="Favorie Kitchen"
										autocomplete="organization"
										required
										value={form?.name ?? ''}
									/>

									<div class="flex flex-col gap-1.5">
										<span class="text-sm font-semibold text-ink">Where you dispatch from</span>
										<p class="text-xs leading-relaxed text-ink-secondary">
											Search your address, or tap the map to move the pin. We ask once —
											every delivery you request leaves from here.
										</p>
										<div class="relative h-60 overflow-hidden rounded-md border border-border">
											<LocationPickerMap
												bind:point={businessPoint}
												bind:address={businessAddress}
												bind:error={addressError}
												markerRole="business"
												markerLabel="Your business"
												initialCenter={KUMASI_CENTER}
												searchPlaceholder="Search your shop's address"
												showLocateButton
												locateLabel="I'm here now"
											/>
										</div>
										<p class="text-sm {businessPoint ? 'text-ink' : 'text-ink-tertiary'}">
											{businessAddress || 'No location pinned yet'}
										</p>
										{#if addressError}
											<p class="text-xs font-medium text-danger">{addressError}</p>
										{/if}
									</div>

									<!-- The map writes the coordinate; these carry it to the action,
									     which re-checks the zone rather than trusting them. -->
									<input type="hidden" name="address" value={businessAddress} />
									<input type="hidden" name="lat" value={businessPoint?.lat ?? ''} />
									<input type="hidden" name="lng" value={businessPoint?.lng ?? ''} />
								{:else}
									<Input
										label="Full name"
										type="text"
										name="name"
										placeholder="Kwame Asante"
										autocomplete="name"
										required
										value={form?.name ?? ''}
									/>
									<Input
										label="Phone number"
										type="tel"
										name="phone"
										placeholder="(555) 000-0000"
										autocomplete="tel"
										required
										value={form?.phone ?? ''}
									/>
								{/if}
							{/if}

							<Input
								label={mode === 'sign-up' && role === 'business' ? 'Work email' : 'Email'}
								type="email"
								name="email"
								placeholder="Enter your email address"
								autocomplete="email"
								required
								value={form?.email ?? ''}
							/>
							<Input
								label="Password"
								type="password"
								name="password"
								placeholder={mode === 'sign-up'
									? `At least ${MIN_PASSWORD_LENGTH} characters`
									: 'Enter your password'}
								autocomplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
								minlength={mode === 'sign-up' ? MIN_PASSWORD_LENGTH : undefined}
								required
							/>

							{#if mode === 'sign-in'}
								<div class="flex items-center justify-between text-sm">
									<label class="flex items-center gap-2 text-ink-secondary">
										<input
											type="checkbox"
											name="rememberMe"
											class="h-4 w-4 rounded border-border text-primary focus:ring-primary"
										/>
										Remember me
									</label>
									<a href="/auth?mode=reset" class="font-medium text-primary hover:underline">
										Forgot password?
									</a>
								</div>
							{/if}

							<Button variant="primary" size="lg" fullWidth type="submit" disabled={submitting}>
								{#if submitting}
									{mode === 'sign-up' ? 'Creating account…' : 'Signing in…'}
								{:else}
									{mode === 'sign-up' ? 'Create account' : 'Login'}
								{/if}
							</Button>

							<div class="flex items-center justify-center gap-2 text-sm text-ink-secondary">
								<span>{mode === 'sign-up' ? 'Already have an account?' : "Don't have an account?"}</span>
								<!-- A link, so switching modes works without JavaScript and drops the
								     other mode's error along with the query string. -->
								<a
									href={mode === 'sign-up' ? '/auth' : '/auth?mode=sign-up'}
									class="font-semibold text-primary underline-offset-2 hover:underline"
								>
									{mode === 'sign-up' ? 'Sign in' : 'Create account'}
								</a>
							</div>
						</form>
					{/if}

					<p class="mt-4 text-center text-xs leading-relaxed text-ink-tertiary lg:mt-6">
						No payment info needed — YADA only locates and tracks riders.
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