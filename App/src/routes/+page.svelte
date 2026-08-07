<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { inview, motion, typeDuration, typewriter } from '$lib/client/motion';
	import Button from '$lib/components/Button.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { getSession } from '$auth/session.svelte';
	import IconCheck from '~icons/mdi/check-bold';

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

	/* ---------------------------------------------------------------- motion */

	/** Svelte plays intro transitions only for nodes it *creates*, and SvelteKit
	 *  hydrates rather than mounts — so everything that flies in waits on this
	 *  flag, which can only become true on the client. */
	let mounted = $state(false);

	/** Sections below the fold wait for the scroll to reach them. Each flag is
	 *  one-way: revealed content is never animated out again. */
	let seen = $state({ audiences: false, steps: false, closing: false, footer: false });

	const HEADLINE = ['Find Riders,', 'with ease.'];
	const TYPE_SPEED = 2.4;

	// The rest of the hero is scheduled off the end of the typing rather than
	// off a guess, so retiming the headline retimes everything under it.
	const FIRST_LINE_END = 150 + typeDuration(HEADLINE[0], TYPE_SPEED);
	const HEADLINE_END = FIRST_LINE_END + typeDuration(HEADLINE[1], TYPE_SPEED);

	onMount(() => {
		mounted = true;
	});

	/* ----------------------------------------------------------------- copy */

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
	<title>YADA — delivery request & tracking for Kumasi</title>
	<meta
		name="description"
		content="YADA connects Kumasi businesses with couriers nearby, and keeps both sides on the same map from pickup to drop-off."
	/>
</svelte:head>

<div class="min-h-svh bg-surface">
	<!-- Header -->
	<header class="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
		<div class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
			{#if mounted}
				<a
					href="/"
					class="inline-flex shrink-0 items-center"
					aria-label="YADA home"
					in:fly={motion({ y: -14, duration: 500, easing: cubicOut })}
				>
					<img src="/logo.svg" alt="" class="h-8 w-auto" />
				</a>

				<div
					class="flex items-center gap-2 sm:gap-3"
					in:fly={motion({ y: -14, duration: 500, delay: 80, easing: cubicOut })}
				>
					<!-- The saved theme applies to every page, including this one, so the
					     way out of it has to exist somewhere a signed-out visitor can
					     reach. This is that place. -->
					<ThemeToggle compact />

					{#if signedIn}
						<a href={workspaceHref}>
							<Button variant="primary" size="sm">{workspaceLabel}</Button>
						</a>
					{:else}
						<a href="/auth" class="hidden sm:block">
							<Button variant="neutral" size="sm">Sign in</Button>
						</a>
						<a href={signUpHref('business')}>
							<Button variant="primary" size="sm">Get started</Button>
						</a>
					{/if}
				</div>
			{/if}
		</div>
	</header>

	<!-- Hero -->
	<section class="border-b border-border bg-surface-sunken">
		<div
			class="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:py-20"
		>
			<div>
				{#if mounted}
					<p
						class="text-eyebrow font-mono text-primary"
						in:fly={motion({ y: 10, duration: 450, delay: 60, easing: cubicOut })}
					>
						Kumasi · KNUST &amp; Ayeduase
					</p>
				{/if}

				<!-- The height of both lines is held from the first paint, so the
				     headline types into reserved space instead of shoving the rest
				     of the hero down a line at a time. -->
				<h1
					class="mt-4 min-h-[2.2em] text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl"
				>
					{#if mounted}
						<span class="block" in:typewriter={{ speed: TYPE_SPEED, delay: 150 }}>{HEADLINE[0]}</span>
						<!-- Held until the line above has finished, so the headline is
						     written one line at a time rather than both at once. -->
						<span class="block" in:typewriter={{ speed: TYPE_SPEED, delay: FIRST_LINE_END }}
							>{HEADLINE[1]}</span
						>
					{/if}
				</h1>

				{#if mounted}
					<p
						class="mt-5 max-w-lg text-base leading-relaxed text-ink-secondary sm:text-lg"
						in:fly={motion({ y: 16, duration: 600, delay: HEADLINE_END, easing: cubicOut })}
					>
						YADA puts the business that sent the parcel and the courier carrying it on the same map —
						from the moment a request goes out to the moment it lands.
					</p>

					<div class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
						{#if signedIn}
							<a
								href={workspaceHref}
								class="sm:w-auto"
								in:fly={motion({ y: 16, duration: 500, delay: HEADLINE_END + 120, easing: cubicOut })}
							>
								<Button variant="primary" size="lg" fullWidth>{workspaceLabel}</Button>
							</a>
						{:else}
							<a
								href={signUpHref('business')}
								class="sm:w-auto"
								in:fly={motion({ y: 16, duration: 500, delay: HEADLINE_END + 120, easing: cubicOut })}
							>
								<Button variant="primary" size="lg" fullWidth>Create an account</Button>
							</a>
							<a
								href="/auth"
								class="sm:w-auto"
								in:fly={motion({ y: 16, duration: 500, delay: HEADLINE_END + 220, easing: cubicOut })}
							>
								<Button variant="outline" size="lg" fullWidth>I already have one</Button>
							</a>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Brand motif: a parcel travelling a dashed route -->
			{#if mounted}
				<div
					class="float-panel relative hidden aspect-[4/3] overflow-hidden rounded-xl bg-primary p-8 shadow-lg lg:block"
					aria-hidden="true"
					in:fly={motion({ x: 40, y: 20, duration: 800, delay: 220, easing: cubicOut })}
				>
					<div class="absolute left-7 top-7 grid grid-cols-5 gap-2.5">
						{#each dotGrid as _, i}
							<span
								class="h-1.5 w-1.5 rounded-full bg-primary-on/35"
								in:scale={motion({ duration: 320, delay: 480 + i * 24, start: 0.2 })}
							></span>
						{/each}
					</div>

					<div class="float-shape absolute right-9 top-9">
						<div class="relative h-16 w-16 rounded-lg border-2 border-primary-on/70">
							<span
								class="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-primary-on/70"
							></span>
							<span
								class="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-primary-on/70"
							></span>
						</div>
						<span class="pulse-shape absolute -bottom-2 -right-2 h-4 w-4 rounded-full bg-secondary"
						></span>
					</div>

					<div class="absolute inset-x-8 top-1/2 h-px border-t-2 border-dashed border-primary-on/35">
						<span class="travel-shape absolute -top-[5px] h-2.5 w-2.5 rounded-full bg-primary-on"
						></span>
					</div>

					<div class="absolute bottom-8 left-8 flex items-center gap-4">
						<div class="relative h-24 w-24 shrink-0">
							<span
								class="spin-shape absolute inset-0 rounded-full border-2 border-dashed border-primary-on/40"
							></span>
							<span class="pulse-shape absolute bottom-1 left-1 h-12 w-12 rounded-full bg-secondary"
							></span>
							<span class="absolute right-0 top-0 h-4 w-4 rounded-full bg-primary-on"></span>
						</div>
						<div class="grid grid-cols-4 gap-2.5">
							{#each Array.from({ length: 12 }) as _, i}
								<span
									class="h-1.5 w-1.5 rounded-full bg-primary-on/35"
									in:scale={motion({ duration: 320, delay: 640 + i * 24, start: 0.2 })}
								></span>
							{/each}
						</div>
					</div>
				</div>
			{/if}
		</div>
	</section>

	<!-- Two actors -->
	<section class="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
		<!-- min-h holds the grid's footprint before the cards arrive, so the
		     observers further down the page can't all fire on the first paint. -->
		<div class="min-h-[36rem] md:min-h-[26rem]" use:inview={() => (seen.audiences = true)}>
			{#if seen.audiences}
				<div class="max-w-2xl">
					<p
						class="text-eyebrow font-mono text-ink-tertiary"
						in:fly={motion({ y: 14, duration: 500, easing: cubicOut })}
					>
						Two sides, one delivery
					</p>
					<h2
						class="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl"
						in:fly={motion({ y: 18, duration: 600, delay: 80, easing: cubicOut })}
					>
						Built for whichever end you are on
					</h2>
				</div>

				<div class="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:mt-10">
					{#each audiences as audience, i}
						<article
							class="lift-card flex flex-col rounded-xl border border-border bg-surface p-6 shadow-xs"
							in:fly={motion({ y: 28, duration: 650, delay: 180 + i * 130, easing: cubicOut })}
						>
							<p class="text-eyebrow font-mono text-primary">{audience.eyebrow}</p>
							<h3 class="mt-3 text-xl font-semibold tracking-tight text-ink">{audience.title}</h3>
							<p class="mt-2 text-sm leading-relaxed text-ink-secondary">{audience.blurb}</p>

							<ul class="mt-5 flex flex-col gap-2.5">
								{#each audience.points as point, j}
									<li
										class="flex items-start gap-2.5 text-sm text-ink-secondary"
										in:fly={motion({
											x: -10,
											duration: 420,
											delay: 320 + i * 130 + j * 90,
											easing: cubicOut
										})}
									>
										<IconCheck class="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
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
			{/if}
		</div>
	</section>

	<!-- How it works -->
	<section class="border-y border-border bg-surface-sunken">
		<div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
			<div class="min-h-[30rem] md:min-h-[18rem]" use:inview={() => (seen.steps = true)}>
				{#if seen.steps}
					<div class="max-w-2xl">
						<p
							class="text-eyebrow font-mono text-ink-tertiary"
							in:fly={motion({ y: 14, duration: 500, easing: cubicOut })}
						>
							How it works
						</p>
						<h2
							class="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl"
							in:fly={motion({ y: 18, duration: 600, delay: 80, easing: cubicOut })}
						>
							Three steps, no phone calls
						</h2>
					</div>

					<ol class="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3 lg:mt-10">
						{#each steps as step, i}
							<li
								class="lift-card rounded-xl border border-border bg-surface p-6 shadow-xs"
								in:fly={motion({ y: 30, duration: 650, delay: 180 + i * 140, easing: cubicOut })}
							>
								<p
									class="font-mono-data text-2xl font-bold text-primary"
									in:scale={motion({ duration: 500, delay: 300 + i * 140, start: 0.5 })}
								>
									{step.n}
								</p>
								<h3 class="mt-3 text-base font-semibold text-ink">{step.title}</h3>
								<p class="mt-2 text-sm leading-relaxed text-ink-secondary">{step.body}</p>
							</li>
						{/each}
					</ol>
				{/if}
			</div>
		</div>
	</section>

	<!-- Closing CTA -->
	{#if !signedIn}
		<section class="relative bg-primary px-4 py-14 sm:px-6 lg:py-20">
			<div class="mx-auto min-h-[16rem] max-w-6xl" use:inview={() => (seen.closing = true)}>
				{#if seen.closing}
					<div
						class="pointer-events-none absolute -left--8 -top-6 grid grid-cols-4 gap-2 opacity-30"
						aria-hidden="true"
						in:fade={motion({ duration: 700, delay: 200 })}
					>
						{#each Array.from({ length: 16 }) as _}
							<span class="h-1.5 w-1.5 rounded-full bg-primary-on"></span>
						{/each}
					</div>

					<h2
						class="relative z-10 mx-auto max-w-xl text-center text-3xl font-bold tracking-tight text-primary-on sm:text-4xl"
						in:fly={motion({ y: 24, duration: 650, easing: cubicOut })}
					>
						Start requesting, or start riding
					</h2>
					<p
						class="relative z-10 mx-auto mt-4 max-w-md text-center text-base leading-relaxed text-primary-on/80"
						in:fly={motion({ y: 20, duration: 600, delay: 120, easing: cubicOut })}
					>
						Pick the side you are on.
					</p>

					<div class="relative z-10 mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
						<a
							href={signUpHref('business')}
							in:fly={motion({ y: 18, duration: 550, delay: 240, easing: cubicOut })}
						>
							<Button variant="secondary" size="lg">I run a business</Button>
						</a>
						<a
							href={signUpHref('courier')}
							in:fly={motion({ y: 18, duration: 550, delay: 340, easing: cubicOut })}
						>
							<Button variant="secondary" size="lg">I am a courier</Button>
						</a>
					</div>
				{/if}
			</div>
		</section>
	{/if}

	<!-- Footer -->
	<footer class="border-t border-border bg-surface">
		<div
			class="mx-auto flex min-h-[6rem] max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6"
			use:inview={() => (seen.footer = true)}
		>
			{#if seen.footer}
				<a
					href="/"
					class="inline-flex shrink-0 items-center"
					aria-label="YADA home"
					in:fade={motion({ duration: 500 })}
				>
					<img src="/logo.svg" alt="" class="h-8 w-auto" />
				</a>
				<p class="text-sm text-ink-tertiary" in:fade={motion({ duration: 500, delay: 100 })}>
					Serving Kumasi — KNUST and Ayeduase.
				</p>
				{#if !signedIn}
					<a
						href="/auth"
						class="text-sm font-semibold text-primary hover:underline"
						in:fade={motion({ duration: 500, delay: 200 })}
					>
						Sign in
					</a>
				{/if}
			{/if}
		</div>
	</footer>
</div>

<style>
	.float-panel {
		animation: panel-drift 7s ease-in-out infinite;
	}
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

	/* Cards settle after their fly-in, then answer the pointer. */
	.lift-card {
		transition:
			transform var(--duration-normal) var(--ease-standard),
			box-shadow var(--duration-normal) var(--ease-standard);
	}
	.lift-card:hover {
		transform: translateY(-4px);
		box-shadow: var(--shadow-md);
	}

	@keyframes panel-drift {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-10px);
		}
	}
	@keyframes float {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-6px);
		}
	}
	@keyframes pulse-scale {
		0%,
		100% {
			transform: scale(1);
			opacity: 1;
		}
		50% {
			transform: scale(1.15);
			opacity: 0.75;
		}
	}
	@keyframes spin-slow {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes travel {
		0% {
			left: 0%;
		}
		50% {
			left: calc(100% - 10px);
		}
		100% {
			left: 0%;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.float-panel,
		.float-shape,
		.pulse-shape,
		.spin-shape,
		.travel-shape {
			animation: none !important;
		}
		.lift-card {
			transition: none;
		}
		.lift-card:hover {
			transform: none;
		}
	}
</style>
