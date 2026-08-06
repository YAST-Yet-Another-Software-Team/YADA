<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import Button from '$lib/components/Button.svelte';
	import { getSession } from '$auth/session.svelte';
	import IconCompass from '~icons/mdi/compass-off-outline';
	import IconLock from '~icons/mdi/lock-outline';
	import IconCloudOff from '~icons/mdi/cloud-off-outline';
	import IconClock from '~icons/mdi/clock-alert-outline';
	import IconAlert from '~icons/mdi/alert-circle-outline';
	import IconWifiOff from '~icons/mdi/wifi-off';

	/**
	 * The one error page for the whole app.
	 *
	 * SvelteKit renders this for every uncaught load/render failure and every
	 * `error()` thrown by a server route, at any depth — so it has to stand on
	 * its own chrome: the root layout wraps it, but the workspace layouts
	 * (courier tab bar, business nav) do not, and neither does their auth gate.
	 * That last point is why "go home" resolves through the session rather than
	 * hardcoding a path: a signed-out visitor sent to /home would only bounce
	 * back to /auth.
	 */

	const session = getSession();

	/**
	 * A load that failed because the *network* dropped surfaces as a 500 with a
	 * fetch message, which reads as "YADA is broken" when it isn't. Checked on
	 * mount and kept live, so the retry button stops lying the moment the
	 * connection is back.
	 */
	let offline = $state(false);

	onMount(() => {
		const sync = () => (offline = !navigator.onLine);

		sync();
		addEventListener('online', sync);
		addEventListener('offline', sync);

		return () => {
			removeEventListener('online', sync);
			removeEventListener('offline', sync);
		};
	});

	let retrying = $state(false);

	const status = $derived(page.status);

	/** Where "home" is for whoever is looking at this. */
	const homeHref = $derived(
		session.user === null ? '/' : session.user.role === 'courier' ? '/home' : '/dashboard'
	);
	const homeLabel = $derived(session.user === null ? 'Go to the home page' : 'Go to your workspace');

	type Shape = {
		icon: typeof IconAlert;
		title: string;
		body: string;
		/** Retry only where retrying could plausibly work — a 404 will 404 again. */
		retry: boolean;
		signIn?: boolean;
	};

	const shape: Shape = $derived.by(() => {
		if (offline) {
			return {
				icon: IconWifiOff,
				title: 'You are offline',
				body: 'YADA could not reach the network. Check your connection — the page will load once you are back.',
				retry: true
			};
		}

		switch (status) {
			case 404:
				return {
					icon: IconCompass,
					title: 'This page does not exist',
					body: 'The link may be mistyped, or whatever was here has since moved.',
					retry: false
				};

			case 401:
				return {
					icon: IconLock,
					title: 'Please sign in',
					body: 'Your session has expired or you are not signed in yet. Sign in and we will bring you back.',
					retry: false,
					signIn: true
				};

			case 403:
				return {
					icon: IconLock,
					title: 'You cannot open this',
					body: 'This page belongs to a different account or a different workspace to yours.',
					retry: false
				};

			case 408:
			case 504:
				return {
					icon: IconClock,
					title: 'That took too long',
					body: 'The request timed out before it finished. It is usually worth another go.',
					retry: true
				};

			case 429:
				return {
					icon: IconClock,
					title: 'Too many requests',
					body: 'You have made a lot of requests in a short time. Wait a moment, then try again.',
					retry: true
				};

			case 502:
			case 503:
				return {
					icon: IconCloudOff,
					title: 'YADA is temporarily down',
					body: 'The service is unavailable right now. This is on our side, and it is usually brief.',
					retry: true
				};

			default:
				return status >= 500
					? {
							icon: IconAlert,
							title: 'Something went wrong',
							body: 'An unexpected error stopped this page from loading. Nothing you did caused it.',
							retry: true
						}
					: {
							icon: IconAlert,
							title: 'That request could not be completed',
							body: 'The page could not be opened as asked. Try again, or head back to somewhere familiar.',
							retry: true
						};
		}
	});

	/**
	 * SvelteKit fills `message` with its own generic English ("Not Found",
	 * "Internal Error") when nothing better was thrown, and repeating that under
	 * copy that already says it adds noise. Anything an `error()` call wrote
	 * deliberately is worth showing — it is often the only clue.
	 */
	const GENERIC = ['not found', 'internal error', 'internal server error', 'error'];

	const detail = $derived.by(() => {
		const message = page.error?.message?.trim();

		return message && !GENERIC.includes(message.toLowerCase()) ? message : null;
	});

	async function retry() {
		retrying = true;

		try {
			// Re-runs the loads that failed. A render-time failure survives this,
			// so fall back to a full reload rather than leaving the button spinning.
			await invalidateAll();
		} catch {
			location.reload();
		} finally {
			retrying = false;
		}
	}

	function goBack() {
		// `back()` on a first-load error would leave YADA entirely; only offer it
		// when this page is somewhere in our own history.
		if (history.length > 1) {
			history.back();
		} else {
			void goto(homeHref);
		}
	}
</script>

<svelte:head>
	<title>{shape.title} | YADA</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="flex min-h-svh flex-col bg-surface-sunken">
	<header class="border-b border-border bg-surface">
		<div class="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
			<a href="/" class="inline-flex shrink-0 items-center" aria-label="YADA home">
				<img src="/logo.svg" alt="" class="h-8 w-auto" />
			</a>
		</div>
	</header>

	<main class="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
		<div
			class="w-full max-w-md rounded-xl border border-border bg-surface p-6 text-center shadow-sm sm:p-8"
		>
			<span
				class="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary-subtle text-primary"
				aria-hidden="true"
			>
				<shape.icon class="h-7 w-7" />
			</span>

			<p class="text-eyebrow mt-5 font-mono text-ink-tertiary">Error {status}</p>
			<h1 class="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{shape.title}</h1>
			<p class="mt-3 text-sm leading-relaxed text-ink-secondary">{shape.body}</p>

			{#if detail}
				<p
					class="font-mono-data mt-4 break-words rounded-md bg-surface-sunken px-3 py-2 text-left text-xs text-ink-tertiary"
				>
					{detail}
				</p>
			{/if}

			<div class="mt-7 flex flex-col gap-3">
				{#if shape.signIn}
					<a href="/auth">
						<Button variant="primary" fullWidth>Sign in</Button>
					</a>
				{:else if shape.retry}
					<Button variant="primary" fullWidth disabled={retrying} onclick={retry}>
						{retrying ? 'Retrying…' : 'Try again'}
					</Button>
				{:else}
					<a href={homeHref}>
						<Button variant="primary" fullWidth>{homeLabel}</Button>
					</a>
				{/if}

				<div class="flex flex-col gap-2 sm:flex-row sm:gap-3">
					<Button variant="outline" fullWidth onclick={goBack}>Go back</Button>

					{#if shape.signIn || shape.retry}
						<a href={homeHref} class="w-full">
							<Button variant="neutral" fullWidth>{homeLabel}</Button>
						</a>
					{/if}
				</div>
			</div>
		</div>
	</main>
</div>
