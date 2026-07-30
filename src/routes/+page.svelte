<script lang="ts">
	import BrandLogo from '$lib/components/BrandLogo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { auth } from '$lib/stores/auth';
	import { onMount } from 'svelte';

	type Role = 'business' | 'courier';
	type Mode = 'sign-in' | 'sign-up';
	type Metric = {
		label: string;
		value: string;
		detail: string;
	};
	type Step = {
		title: string;
		description: string;
	};

	let mode: Mode = 'sign-in';
	let role: Role = 'business';
	let name = '';
	let phone = '';
	let email = '';
	let password = '';
	let isLoading = true;
	let isSubmitting = false;

	const metrics: Metric[] = [
		{ label: 'Request-to-match', value: '< 5 min', detail: 'Target window for the first courier offer.' },
		{ label: 'Location updates', value: '3 s', detail: 'Near real-time progress on the dispatch map.' },
		{ label: 'Trip states', value: '6', detail: 'Requested through completed, tracked end to end.' }
	];

	const steps: Step[] = [
		{
			title: 'Request a rider',
			description: 'Create a delivery from the dispatch side with pickup, destination, and ETA context.'
		},
		{
			title: 'Match the closest courier',
			description: 'Offers cascade to the best available rider based on proximity and timing.'
		},
		{
			title: 'Track the trip',
			description: 'Monitor live status, arrival, pickup, and completion from one screen.'
		}
	];

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

	$: headline = mode === 'sign-up' ? 'Create your YADA account' : 'Welcome back';
	$: subheadline =
		mode === 'sign-up'
			? 'Set up a business or courier account and get into the right flow immediately.'
			: 'Sign in to continue to your dispatch or courier workspace.';
	$: roleSummary =
		role === 'business'
			? 'Best for dispatchers who create and track deliveries.'
			: 'Best for riders who accept offers and manage active trips.';
</script>

<svelte:head>
	<title>YADA | Motor courier dispatch</title>
	<meta name="description" content="Sign in or create an account to dispatch and track courier deliveries in YADA." />
</svelte:head>

<div class="min-h-svh bg-bg px-4 py-6 sm:px-6 lg:px-8">
	<div class="mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-7xl flex-col gap-6 lg:gap-8">
		<header class="flex items-center justify-between gap-4">
			<BrandLogo href="/" size="lg" />
			<div class="hidden items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink-secondary shadow-xs sm:flex">
				<span class="h-2 w-2 rounded-full bg-primary animate-yada-pulse"></span>
				Dispatch flow live
			</div>
		</header>

		<main class="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] lg:items-stretch lg:gap-8">
			<section class="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8 lg:flex lg:flex-col lg:justify-between lg:p-10">
				<div class="space-y-6">
					<div class="inline-flex items-center rounded-full bg-primary-subtle px-3 py-1 text-xs font-semibold text-primary">
						Motor courier dispatch
					</div>
					<div class="space-y-4">
						<h1 class="max-w-xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl lg:text-6xl">
							{headline}
						</h1>
						<p class="max-w-2xl text-lg leading-relaxed text-ink-secondary sm:text-xl">
							{subheadline}
						</p>
					</div>

					<div class="grid gap-3 sm:grid-cols-3">
						{#each metrics as metric (metric.label)}
							<div class="rounded-xl border border-border bg-bg p-4 shadow-xs">
								<p class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-tertiary">
									{metric.label}
								</p>
								<p class="font-mono-data mt-3 text-2xl font-bold text-ink">{metric.value}</p>
								<p class="mt-2 text-sm leading-5 text-ink-secondary">{metric.detail}</p>
							</div>
						{/each}
					</div>

					<div class="grid gap-3 md:grid-cols-3">
						{#each steps as step, index (step.title)}
							<article class="rounded-xl border border-border bg-bg p-4 shadow-xs">
								<p class="font-mono-data text-xs font-semibold text-primary">0{index + 1}</p>
								<h2 class="mt-3 text-base font-semibold text-ink">{step.title}</h2>
								<p class="mt-2 text-sm leading-6 text-ink-secondary">{step.description}</p>
							</article>
						{/each}
					</div>
				</div>

				<div class="mt-8 grid gap-3 border-t border-border pt-6 sm:grid-cols-2">
					<div class="rounded-xl border border-border bg-bg p-4 shadow-xs">
						<p class="text-sm font-semibold text-ink">Business</p>
						<p class="mt-1 text-sm leading-6 text-ink-secondary">
							Request deliveries, see live rider status, and keep the team in one dispatch view.
						</p>
					</div>
					<div class="rounded-xl border border-border bg-bg p-4 shadow-xs">
						<p class="text-sm font-semibold text-ink">Courier</p>
						<p class="mt-1 text-sm leading-6 text-ink-secondary">
							Accept offers, follow the route, and finish each trip from a simple mobile flow.
						</p>
					</div>
				</div>
			</section>

			<section class="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8 lg:p-10">
				<div class="mb-8 text-center">
					<h2 class="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{headline}</h2>
					<p class="mt-3 text-base leading-6 text-ink-secondary">{subheadline}</p>
				</div>

				<form class="flex flex-col gap-4" on:submit|preventDefault={submitAuth}>
					{#if mode === 'sign-up'}
						<div class="space-y-2">
							<p class="text-sm font-semibold text-ink">Choose your role</p>
							<div class="grid grid-cols-2 gap-2 rounded-xl bg-surface-sunken p-1">
								<button
									type="button"
									class="rounded-lg px-3 py-2.5 text-sm font-semibold transition {role === 'business'
										? 'bg-surface text-ink shadow-xs'
										: 'text-ink-secondary hover:text-ink'}"
									aria-pressed={role === 'business'}
									on:click={() => (role = 'business')}
								>
									Business
								</button>
								<button
									type="button"
									class="rounded-lg px-3 py-2.5 text-sm font-semibold transition {role === 'courier'
										? 'bg-surface text-ink shadow-xs'
										: 'text-ink-secondary hover:text-ink'}"
									aria-pressed={role === 'courier'}
									on:click={() => (role = 'courier')}
								>
									Courier
								</button>
							</div>
							<p class="text-sm text-ink-secondary">{roleSummary}</p>
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

					{#if $auth.error}
						<p class="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger" aria-live="polite">
							{$auth.error}
						</p>
					{/if}

					<div class="flex flex-wrap items-center justify-center gap-2 text-sm text-ink-secondary">
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

				<p class="mt-6 text-center text-xs leading-5 text-ink-tertiary">
					No payment info needed. YADA only locates and tracks riders.
				</p>
			</section>
		</main>
	</div>
</div>
