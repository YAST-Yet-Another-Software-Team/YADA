<script lang="ts">
	import { enhance } from '$app/forms';
	import Alert from '$lib/components/Alert.svelte';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import {
		ProfilePhotoError,
		readProfilePhoto,
		readProfilePhotoFromUrl
	} from '$lib/client/images/profile-photo';
	import IconAccount from '~icons/mdi/account-outline';
	import IconCheck from '~icons/mdi/check-bold';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	/**
	 * Finish setting up an account that came in through Google.
	 *
	 * Only reachable while something is missing — the load redirects into the
	 * workspace the moment it isn't — so everything on screen is a question the
	 * sign-up could not ask.
	 */

	// Seeded from the account, not bound to it: a rejected submit re-renders this
	// component rather than remounting it, and what someone is mid-way through
	// typing must survive that.
	// svelte-ignore state_referenced_locally
	let role = $state<'business' | 'courier'>(data.account.role);
	// svelte-ignore state_referenced_locally
	let phone = $state(form?.phone ?? data.account.phone);
	// svelte-ignore state_referenced_locally
	let plate = $state(form?.plate ?? data.account.plate);

	let submitting = $state(false);

	/** The photo that will be posted: always our own downscaled data URL. */
	let photo = $state('');
	let photoError = $state('');
	let photoBusy = $state(false);

	/**
	 * Google's picture, until it is either adopted or replaced. Kept separate
	 * from `photo` because it is not ours yet — it is a URL on someone else's
	 * CDN, and only `keepGooglePhoto` turns it into something we hold.
	 */
	const googlePhoto = $derived(
		data.account.image && !data.account.image.startsWith('data:') ? data.account.image : null
	);

	/** What the avatar well shows right now, in preference order. */
	const preview = $derived(photo || data.account.image || '');

	async function keepGooglePhoto() {
		if (!googlePhoto || photoBusy) return;

		photoBusy = true;
		photoError = '';

		try {
			photo = await readProfilePhotoFromUrl(googlePhoto);
		} catch (error) {
			photoError =
				error instanceof ProfilePhotoError
					? error.message
					: "We couldn't use that picture. Choose a photo instead.";
		} finally {
			photoBusy = false;
		}
	}

	async function handlePhoto(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		photoBusy = true;
		photoError = '';

		try {
			photo = await readProfilePhoto(file);
		} catch (error) {
			photo = '';
			photoError =
				error instanceof ProfilePhotoError
					? error.message
					: "We couldn't read that photo. Try a different one.";
		} finally {
			photoBusy = false;
			// Let the same file be chosen again after a failure.
			input.value = '';
		}
	}
</script>

<svelte:head>
	<title>Finish setting up | YADA</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="flex min-h-svh flex-col bg-surface">
	<header class="shrink-0">
		<div class="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
			<img src="/logo.svg" alt="YADA" class="h-8 w-auto" />
		</div>
	</header>

	<main class="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 sm:px-6">
		<div class="text-center">
			<h1 class="text-2xl font-bold tracking-tight text-ink">
				Almost there, {data.account.name.split(' ')[0]}
			</h1>
			<p class="mt-2 text-sm leading-relaxed text-ink-secondary">
				Google told us who you are. A couple of things it couldn't.
			</p>
		</div>

		<form
			method="POST"
			class="mt-7 flex flex-col gap-4"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
		>
			{#if form?.message}
				<Alert>{form.message}</Alert>
			{/if}

			<!-- Prefilled from whatever the sign-up toggle carried through the OAuth
			     round trip. Shown rather than assumed: clicking Google from the
			     sign-in tab carries nothing, and guessing is the bug this screen
			     exists to close. -->
			<fieldset class="flex flex-col gap-2">
				<legend class="text-sm font-semibold text-ink">I am here as a</legend>
				<div class="grid grid-cols-2 gap-2 rounded-full border border-border bg-surface-sunken p-1">
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
				</div>
			</fieldset>

			<div class="flex flex-col gap-1.5">
				<Input
					label="Phone number"
					type="tel"
					name="phone"
					placeholder="024 123 4567"
					autocomplete="tel"
					inputmode="tel"
					required
					bind:value={phone}
				/>
				<p class="text-xs leading-relaxed text-ink-secondary">
					{role === 'courier'
						? 'How a business reaches you about a delivery in progress.'
						: 'How a rider reaches you about a pickup.'}
				</p>
			</div>

			{#if role === 'courier'}
				<div class="flex flex-col gap-1.5">
					<Input
						label="Number plate"
						type="text"
						name="plate"
						placeholder="GT 4521-20"
						autocapitalize="characters"
						maxlength={16}
						bind:value={plate}
					/>
					<p class="text-xs leading-relaxed text-ink-secondary">
						Businesses see this while they wait, so they know which bike is yours.
					</p>
				</div>

				<div class="flex flex-col gap-2">
					<span class="text-sm font-semibold text-ink">Profile photo</span>
					<p class="text-xs leading-relaxed text-ink-secondary">
						Businesses see this when you accept their delivery, so they know who is at the counter.
					</p>

					<div class="flex items-center gap-4">
						<div
							class="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-sunken"
						>
							{#if preview}
								<img src={preview} alt="Your profile" class="h-full w-full object-cover" />
							{:else}
								<IconAccount class="h-9 w-9 text-ink-disabled" aria-hidden="true" />
							{/if}
						</div>

						<div class="flex min-w-0 flex-col gap-2">
							<!-- Google's picture is a URL on Google's CDN until this button
							     fetches it and puts it through the same downscale an
							     uploaded photo gets. Adopting it is one tap; nothing we
							     store afterwards depends on them. -->
							{#if googlePhoto && !photo}
								<button
									type="button"
									class="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-wash disabled:opacity-60"
									disabled={photoBusy}
									onclick={keepGooglePhoto}
								>
									<IconCheck class="h-4 w-4" aria-hidden="true" />
									{photoBusy ? 'Saving…' : 'Use this photo'}
								</button>
							{/if}

							<label
								class="cursor-pointer rounded-md border border-border bg-surface px-4 py-2.5 text-center text-sm font-semibold text-ink transition-colors hover:bg-wash"
							>
								<input
									type="file"
									accept="image/*"
									class="sr-only"
									disabled={photoBusy}
									onchange={handlePhoto}
								/>
								{photoBusy && !googlePhoto
									? 'Reading…'
									: photo
										? 'Change photo'
										: googlePhoto
											? 'Upload a different one'
											: 'Choose a photo'}
							</label>
						</div>
					</div>

					{#if photoError}
						<p class="text-xs font-medium text-danger">{photoError}</p>
					{/if}

					<!-- The photo travels as a data URL; there is no upload endpoint. -->
					<input type="hidden" name="image" value={photo} />
				</div>
			{/if}

			<Button type="submit" variant="primary" size="lg" fullWidth disabled={submitting || photoBusy}>
				{submitting ? 'Saving…' : 'Finish setting up'}
			</Button>
		</form>
	</main>
</div>
