<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { getSession } from '$auth/session.svelte';

	/** Deep-link straight into a sign-up, pre-set to a role. Only this page has
	 *  role-specific calls to action, so it owns the URL shape. */
	function signUpHref(role: 'business' | 'courier') {
		return `/auth?mode=sign-up&role=${role}`;
	}

	// Provided by the root layout, seeded from locals.user during SSR — so a
	// signed-in visitor's header renders correct on the first paint rather than
	// showing "Sign in" and correcting itself on hydration.
	const session = getSession();

	const signedIn = $derived(session.user !== null);
	const workspaceHref = $derived(session.user?.role === 'courier' ? '/home' : '/dashboard');
	const workspaceLabel = $derived(
		session.user?.role === 'courier' ? 'Go to your trips' : 'Go to your dashboard'
	);

	const audiences = [
		{
			role: 'business' as const,
			eyebrow: 'For businesses',
			title: 'Send it, then stop wondering',
			blurb:
				'Raise a delivery, get matched to a rider nearby, and follow the parcel to the door — without a single "where is my order?" phone call.',
			points: [
				'Request a delivery in three fields',
				'Live rider position on the map',
				'Every past delivery kept in history'
			],
			cta: 'Sign up as a business'
		},
		{
			role: 'courier' as const,
			eyebrow: 'For couriers',
			title: 'Go online. Get the next job',
			blurb:
				'Offers come to you while you are online. Accept the ones that work, follow the route, and your completed trips add themselves up.',
			points: [
				'Accept or decline each offer',
				'Turn-by-turn route to pickup and drop-off',
				'Trips and distance totalled for you'
			],
			cta: 'Sign up as a courier'
		}
	];

	const steps = [
		{
			n: '01',
			title: 'A business raises a request',
			body: 'Pickup address, drop-off address, and any note for the rider.'
		},
		{
			n: '02',
			title: 'A courier nearby accepts',
			body: 'The offer goes out to online couriers. First to accept takes the trip.'
		},
		{
			n: '03',
			title: 'Both sides watch it move',
			body: 'The rider follows the route; the business follows the rider. Same map, same moment.'
		}
	];

	const dotGrid = Array.from({ length: 20 });
</script>

<svelte:head>
	<title>YADA — delivery tracking for Kumasi</title>
	<meta
		name="description"
		content="YADA connects Kumasi businesses with couriers nearby, and keeps both sides on the same map from pickup to drop-off."
	/>
</svelte:head>

<div class="min-h-svh bg-surface">
	<!-- Header -->
	<header class="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
		<div class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
			<a href="/" class="inline-flex shrink-0 items-center" aria-label="YADA home">
				<img src="/logo.svg" alt="" class="h-8 w-auto" />
			</a>

			<div class="flex items-center gap-2 sm:gap-3">
				{#if signedIn}
					<a href={workspaceHref}>
						<Button variant="primary" size="sm">{workspaceLabel}</Button>
					</a>
				{:else}
					<a href="/auth" class="hidden sm:block">
						<Button variant="ghost" size="sm">Sign in</Button>
					</a>
					<a href={signUpHref('business')}>
						<Button variant="primary" size="sm">Get started</Button>
					</a>
				{/if}
			</div>
		</div>
	</header>

	<!-- Hero -->
	<section class="border-b border-border bg-surface-sunken">
		<div
			class="mx-auto py-14 grid max-w-6xl grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:py-20"
		>
			<div>
				<p class="text-eyebrow font-mono text-primary">Kumasi · KNUST &amp; Ayeduase</p>
				<h1
					class="mt-4 text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl"
				>
					Find Riders,<br />with ease.
				</h1>
				<p class="mt-5 max-w-lg text-base leading-relaxed text-ink-secondary sm:text-lg">
					YADA puts the business that sent the parcel and the courier carrying it on the same
					map — from the moment a request goes out to the moment it lands.
				</p>

				<div class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
					{#if signedIn}
						<a href={workspaceHref} class="sm:w-auto">
							<Button variant="primary" size="lg" fullWidth>{workspaceLabel}</Button>
						</a>
					{:else}
						<a href={signUpHref('business')} class="sm:w-auto">
							<Button variant="primary" size="lg" fullWidth>Create an account</Button>
						</a>
						<a href="/auth" class="sm:w-auto">
							<Button variant="outline" size="lg" fullWidth>I already have one</Button>
						</a>
					{/if}
				</div>
			</div>

			<!-- Brand motif: a parcel travelling a dashed route -->
			<div
				class="relative hidden aspect-[4/3] overflow-hidden rounded-xl bg-primary p-8 shadow-lg lg:block"
				aria-hidden="true"
			>
				<div class="absolute left-7 top-7 grid grid-cols-5 gap-2.5">
					{#each dotGrid as _}
						<span class="h-1.5 w-1.5 rounded-full bg-primary-on/35"></span>
					{/each}
				</div>

				<div class="absolute right-9 top-9 float-shape">
					<div class="relative h-16 w-16 rounded-lg border-2 border-primary-on/70">
						<span
							class="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-primary-on/70"
						></span>
						<span
							class="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-primary-on/70"
						></span>
					</div>
					<span class="absolute -bottom-2 -right-2 h-4 w-4 rounded-full bg-secondary pulse-shape"
					></span>
				</div>

				<div class="absolute inset-x-8 top-1/2 h-px border-t-2 border-dashed border-primary-on/35">
					<span class="absolute -top-[5px] h-2.5 w-2.5 rounded-full bg-primary-on travel-shape"
					></span>
				</div>

				<div class="absolute bottom-8 left-8 flex items-center gap-4">
					<div class="relative h-24 w-24 shrink-0">
						<span
							class="absolute inset-0 spin-shape rounded-full border-2 border-dashed border-primary-on/40"
						></span>
						<span class="absolute bottom-1 left-1 h-12 w-12 rounded-full bg-secondary pulse-shape"
						></span>
						<span class="absolute right-0 top-0 h-4 w-4 rounded-full bg-primary-on"></span>
					</div>
					<div class="grid grid-cols-4 gap-2.5">
						{#each Array.from({ length: 12 }) as _}
							<span class="h-1.5 w-1.5 rounded-full bg-primary-on/35"></span>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Two actors -->
	<section class="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
		<div class="max-w-2xl">
			<p class="text-eyebrow font-mono text-ink-tertiary">Two sides, one delivery</p>
			<h2 class="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
				Built for whichever end you are on
			</h2>
		</div>

		<div class="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:mt-10">
			{#each audiences as audience}
				<article class="flex flex-col rounded-xl border border-border bg-surface p-6 shadow-xs">
					<p class="text-eyebrow font-mono text-primary">{audience.eyebrow}</p>
					<h3 class="mt-3 text-xl font-semibold tracking-tight text-ink">{audience.title}</h3>
					<p class="mt-2 text-sm leading-relaxed text-ink-secondary">{audience.blurb}</p>

					<ul class="mt-5 flex flex-col gap-2.5">
						{#each audience.points as point}
							<li class="flex items-start gap-2.5 text-sm text-ink-secondary">
								<svg
									viewBox="0 0 24 24"
									class="mt-0.5 h-4 w-4 shrink-0 text-primary"
									fill="none"
									stroke="currentColor"
									stroke-width="2.5"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
								>
									<path d="m5 12 5 5L20 7" />
								</svg>
								{point}
							</li>
						{/each}
					</ul>

					{#if !signedIn}
						<div class="mt-6 pt-1">
							<a href={signUpHref(audience.role)}>
								<Button variant="outline" size="sm" fullWidth>{audience.cta}</Button>
							</a>
						</div>
					{/if}
				</article>
			{/each}
		</div>
	</section>

	<!-- How it works -->
	<section class="border-y border-border bg-surface-sunken">
		<div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
			<div class="max-w-2xl">
				<p class="text-eyebrow font-mono text-ink-tertiary">How it works</p>
				<h2 class="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
					Three steps, no phone calls
				</h2>
			</div>

			<ol class="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3 lg:mt-10">
				{#each steps as step}
					<li class="rounded-xl border border-border bg-surface p-6 shadow-xs">
						<p class="font-mono-data text-2xl font-bold text-primary">{step.n}</p>
						<h3 class="mt-3 text-base font-semibold text-ink">{step.title}</h3>
						<p class="mt-2 text-sm leading-relaxed text-ink-secondary">{step.body}</p>
					</li>
				{/each}
			</ol>
		</div>
	</section>

	<!-- Closing CTA -->
	{#if !signedIn}
		<section class="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
			<div
				class="relative overflow-hidden rounded-xl bg-primary px-6 py-12 text-center sm:px-12 lg:py-16"
			>
				<div
					class="pointer-events-none absolute -right-4 -top-4 grid grid-cols-4 gap-2 opacity-30"
					aria-hidden="true"
				>
					{#each Array.from({ length: 16 }) as _}
						<span class="h-1.5 w-1.5 rounded-full bg-primary-on"></span>
					{/each}
				</div>

				<h2
					class="relative z-10 mx-auto max-w-xl text-3xl font-bold tracking-tight text-primary-on sm:text-4xl"
				>
					Start sending, or start riding
				</h2>
				<p class="relative z-10 mx-auto mt-4 max-w-md text-base leading-relaxed text-primary-on/80">
					Pick the side you are on. It takes an email and a password.
				</p>

				<div
					class="relative z-10 mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
				>
					<a href={signUpHref('business')}>
						<Button variant="secondary" size="lg">I run a business</Button>
					</a>
					<a href={signUpHref('courier')}>
						<Button variant="secondary" size="lg">I am a courier</Button>
					</a>
				</div>
			</div>
		</section>
	{/if}

	<!-- Footer -->
	<footer class="border-t border-border bg-surface">
		<div
			class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6"
		>
			<a href="/" class="inline-flex shrink-0 items-center" aria-label="YADA home">
				<img src="/logo.svg" alt="" class="h-8 w-auto" />
			</a>
			<p class="text-sm text-ink-tertiary">
				Serving Kumasi — KNUST and Ayeduase.
			</p>
			{#if !signedIn}
				<a href="/auth" class="text-sm font-semibold text-primary hover:underline">
					Sign in
				</a>
			{/if}
		</div>
	</footer>
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
