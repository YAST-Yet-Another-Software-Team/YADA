<script lang="ts">
  import { enhance } from "$app/forms";
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { fade, fly, scale, slide } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import { motion, typeDuration, typewriter } from "$lib/client/motion";
  import type { SubmitFunction } from "@sveltejs/kit";
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import Input from "$lib/components/Input.svelte";
  import IconAccount from "~icons/mdi/account-outline";
  import IconGoogle from "~icons/devicon/google";
  import {
    ProfilePhotoError,
    readProfilePhoto,
  } from "$lib/client/images/profile-photo";
  import { maskPhone } from "$lib/shared/phone";
  import { maskPlate } from "$lib/shared/plate";
  import type { PageProps } from "./$types";

  type Role = "business" | "courier";
  type Mode = "sign-in" | "sign-up" | "reset";

  // `form` is whatever the last action returned: a `fail()` payload with the
  // values to restore and the step to reopen, or `{ sent: true }` from reset.
  let { data, form }: PageProps = $props();

  // Which panel is on screen lives in the URL, not in component state, so the
  // mode toggle is an ordinary link. That keeps it working with JavaScript off
  // and makes ?mode=sign-up&role=courier from the landing page the same
  // mechanism rather than a special case read once at init.
  const mode = $derived<Mode>(
    page.url.searchParams.get("mode") === "sign-up"
      ? "sign-up"
      : page.url.searchParams.get("mode") === "reset"
        ? "reset"
        : "sign-in",
  );

  // Set by /reset-password on its way here. The new password is already saved
  // by this point; without a word, the redirect would look like the reset form
  // had simply dumped them back at sign-in.
  const resetDone = $derived(page.url.searchParams.get("reset") === "done");

  // Role is a radio inside the form: `bind:group` picks which fields render,
  // and the same input carries the value to the action.
  let role = $state<Role>(
    page.url.searchParams.get("role") === "courier" ? "courier" : "business",
  );

  $effect(() => {
    if (form?.role === "courier" || form?.role === "business") role = form.role;
  });

  // Seeded from `form` at creation, not bound to it: that fills the fields back
  // in after a no-JavaScript round trip, while leaving what someone is
  // currently typing alone — `use:enhance` re-renders this component rather
  // than remounting it. The password is deliberately never restored.
  // svelte-ignore state_referenced_locally
  let name = $state(form?.name ?? "");
  // svelte-ignore state_referenced_locally
  let email = $state(form?.email ?? "");
  // Restored through the same mask the field applies, so a round trip comes
  // back grouped rather than as the raw string the action echoed.
  // svelte-ignore state_referenced_locally
  let phone = $state(maskPhone(form?.phone ?? ""));
  // svelte-ignore state_referenced_locally
  let plate = $state(maskPlate(form?.plate ?? ""));
  let password = $state("");

  let submitting = $state(false);
  let googlePending = $state(false);

  // ---------------------------------------------------------------------------
  // Sign-up steps
  //
  // Only a courier gets them, and only because of the photo: a business signs
  // up with four fields, and splitting those across screens would add clicks
  // and buy nothing. There is no schema here to decide what a step accepts —
  // the inputs carry their constraints as HTML attributes and the browser is
  // asked directly; the real rules run once, in the action, and a rejected
  // field comes back with the step it lives on (`form.step`).
  //
  // Steps are also only *steps* once JavaScript is running. Server-rendered,
  // both fieldsets are present and visible, so the form still submits in one
  // go with scripting off.
  // ---------------------------------------------------------------------------

  let step = $state(0);
  let stepError = $state("");
  let detailsFields = $state<HTMLFieldSetElement>();

  let stepped = $state(false);

  /**
   * The same fact as `stepped` — the client is running — but read by the brand
   * panel rather than the form. Svelte plays intro transitions only on nodes it
   * *creates*, and SvelteKit hydrates rather than mounts, so the panel's pieces
   * wait on a flag that can only become true here. The form deliberately does
   * not: gating it would leave a scriptless visitor with nothing to sign in
   * with, so that column animates in CSS instead (see `.rise` below).
   */
  let mounted = $state(false);

  onMount(() => {
    stepped = true;
    mounted = true;
  });

  /** A business fills one screen; only the courier's photo earns a second. */
  const multiStep = $derived(stepped && role === "courier");
  const onLastStep = $derived(step >= 1);

  // Switching to Business collapses the form, so any step past the first
  // would leave nothing on screen.
  $effect(() => {
    if (role === "business") step = 0;
  });

  /** A rejected submit reopens the step that owns the field it complained about. */
  $effect(() => {
    if (form?.step != null) step = form.step;
  });

  function nextStep() {
    // The browser already knows what an empty required field or a too-short
    // password is — the constraints are on the inputs. `reportValidity` shows
    // its bubble on the first offender and holds the step.
    for (const input of detailsFields?.querySelectorAll("input") ?? []) {
      if (!input.reportValidity()) return;
    }

    stepError = "";
    step = 1;
  }

  /**
   * The courier's photo, already downscaled to a data URL — see
   * `$lib/client/images/profile-photo` for why it travels as one. Never seeded
   * from `form`: a rejected submit doesn't echo it back, and asking someone to
   * pick the same file twice beats posting a hundred kilobytes back to them.
   */
  let photo = $state("");
  let photoError = $state("");
  let photoBusy = $state(false);

  async function handlePhoto(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    photoBusy = true;
    photoError = "";

    try {
      photo = await readProfilePhoto(file);
      stepError = "";
    } catch (error) {
      photo = "";
      photoError =
        error instanceof ProfilePhotoError
          ? error.message
          : "We couldn't read that photo. Try a different one.";
    } finally {
      photoBusy = false;
      // Let the same file be chosen again after a failure.
      input.value = "";
    }
  }

  /**
   * Sign-in and sign-up share this. The one check the browser can't do on its
   * own is the photo — a hidden input escapes constraint validation — so it is
   * caught here with `cancel()` instead of a wasted round trip. Everything else
   * is the action's problem, and its answer arrives as the `form` prop.
   */
  const submitCredentials: SubmitFunction = ({ formData, cancel }) => {
    if (mode === "sign-up" && role === "courier" && !formData.get("image")) {
      stepError = "Add a profile photo so businesses can recognise you.";
      if (stepped) step = 1;
      cancel();
      return;
    }

    stepError = "";
    submitting = true;

    return async ({ update }) => {
      await update();
      submitting = false;
    };
  };

  const submitReset: SubmitFunction = () => {
    submitting = true;

    return async ({ update }) => {
      await update();
      submitting = false;
    };
  };

  const submitGoogle: SubmitFunction = () => {
    googlePending = true;

    return async ({ update }) => {
      await update();
      googlePending = false;
    };
  };

  const dotGrid = Array.from({ length: 20 });
  const miniDotGrid = Array.from({ length: 12 });

  // The panel headline types itself, the same way the landing page's does; what
  // follows it is scheduled off the end of the typing rather than off a guess.
  const HEADLINE = ["Find riders,", "with ease."];
  const TYPE_SPEED = 2.4;
  const FIRST_LINE_END = 260 + typeDuration(HEADLINE[0], TYPE_SPEED);
  const HEADLINE_END = FIRST_LINE_END + typeDuration(HEADLINE[1], TYPE_SPEED);
</script>

<svelte:head>
  <title>Sign in | YADA</title>
  <meta name="description" content="Sign in to YADA." />
</svelte:head>

<div class="min-h-svh bg-surface-sunken lg:px-8 lg:py-10">
  <div
    class="mx-auto flex min-h-svh max-w-6xl items-stretch justify-center lg:min-h-[calc(100vh-2rem)] lg:items-center"
  >
    <div
      class="grid w-full grid-cols-1 overflow-hidden bg-surface lg:grid-cols-[1fr_1fr] lg:rounded-xl lg:border lg:border-border lg:shadow-lg"
    >
      <!-- Mobile-only compact brand band -->
      <section
        class="relative flex w-full items-center justify-end shrink-0 overflow-hidden bg-primary px-5 py-4 lg:hidden"
      >
        {#if mounted}
          <div
            class="relative z-10 flex items-center gap-3"
            in:fly={motion({ x: 28, duration: 600, easing: cubicOut })}
          >
            <div
              class="relative h-px w-12 border-t-2 border-dashed border-primary-on/40"
            >
              <span
                class="absolute -top-[5px] h-2.5 w-2.5 rounded-full bg-primary-on travel-shape"
              ></span>
            </div>
            <div class="relative float-shape">
              <div
                class="relative h-7 w-7 rounded-md border-2 border-primary-on/70"
              >
                <span
                  class="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-primary-on/70"
                ></span>
                <span
                  class="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-primary-on/70"
                ></span>
              </div>
              <span
                class="absolute -bottom-1 -right-1 h-2 w-2 rounded-full bg-secondary pulse-shape"
              ></span>
            </div>
          </div>
        {/if}
      </section>

      <!-- Desktop-only color panel -->
      <section
        class="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 lg:flex"
      >
        {#if mounted}
          <!-- top-left dot grid -->
          <div class="absolute left-8 top-8 grid grid-cols-5 gap-2.5">
            {#each dotGrid as _, i}
              <span
                class="h-1.5 w-1.5 rounded-full bg-primary-on/35"
                in:scale={motion({
                  duration: 320,
                  delay: 120 + i * 22,
                  start: 0.2,
                })}
              ></span>
            {/each}
          </div>

          <!-- floating parcel icon, top-right -->
          <div
            class="absolute right-10 top-10 float-shape"
            in:fly={motion({
              y: -18,
              duration: 600,
              delay: 160,
              easing: cubicOut,
            })}
          >
            <div
              class="relative h-14 w-14 rounded-lg border-2 border-primary-on/70"
            >
              <span
                class="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-primary-on/70"
              ></span>
              <span
                class="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-primary-on/70"
              ></span>
            </div>
            <span
              class="absolute -bottom-2 -right-2 h-4 w-4 rounded-full bg-secondary pulse-shape"
            ></span>
          </div>

          <div class="relative z-10 mt-16">
            <!-- The height of both lines is held from the start, so the
                 headline types into reserved space instead of pushing the
                 paragraph down a line at a time. -->
            <h1
              class="mt-4 min-h-[2.5em] max-w-xs text-4xl font-bold leading-tight tracking-tight text-primary-on"
            >
              <span
                class="block"
                in:typewriter={{ speed: TYPE_SPEED, delay: 260 }}
                >{HEADLINE[0]}</span
              >
              <span
                class="block"
                in:typewriter={{ speed: TYPE_SPEED, delay: FIRST_LINE_END }}
                >{HEADLINE[1]}</span
              >
            </h1>
            <p
              class="mt-4 max-w-xs text-md leading-relaxed text-primary-on/80"
              in:fly={motion({
                y: 14,
                duration: 550,
                delay: HEADLINE_END,
                easing: cubicOut,
              })}
            >
              Sign in to find couriers and track all deliveries.
            </p>
          </div>

          <!-- traveling courier dot along a dashed route -->
          <div
            class="relative z-10 mt-10 h-px w-full border-t-2 border-dashed border-primary-on/35"
            in:fly={motion({
              x: -32,
              duration: 650,
              delay: HEADLINE_END + 120,
              easing: cubicOut,
            })}
          >
            <span
              class="absolute -top-[5px] h-2.5 w-2.5 rounded-full bg-primary-on travel-shape"
            ></span>
          </div>

          <!-- route/tracking motif, bottom -->
          <div
            class="relative z-10 mt-8 flex items-center gap-4"
            in:fly={motion({
              y: 24,
              duration: 650,
              delay: HEADLINE_END + 200,
              easing: cubicOut,
            })}
          >
            <div class="relative h-24 w-24 shrink-0">
              <span
                class="absolute inset-0 spin-shape rounded-full border-2 border-dashed border-primary-on/40"
              ></span>
              <span
                class="absolute bottom-1 left-1 h-12 w-12 rounded-full bg-secondary pulse-shape"
              ></span>
              <span
                class="absolute right-0 top-0 h-4 w-4 rounded-full bg-primary-on"
              ></span>
            </div>
            <div class="grid grid-cols-4 gap-2.5">
              {#each miniDotGrid as _, i}
                <span
                  class="h-1.5 w-1.5 rounded-full bg-primary-on/35"
                  in:scale={motion({
                    duration: 320,
                    delay: HEADLINE_END + 300 + i * 24,
                    start: 0.2,
                  })}
                ></span>
              {/each}
            </div>
          </div>
        {/if}
      </section>

      <!-- Auth form -->
      <section
        class="flex flex-col justify-center p-5 sm:p-6 lg:items-center lg:p-12"
      >
        <div class="mx-auto w-full max-w-sm">
          <div class="flex flex-col items-center text-center">
            <!-- The landing header's logo morphs into this one; see
                 `.vt-brand-logo` in app.css. No `.rise` on it, unlike its
                 neighbours: a view transition photographs the incoming page the
                 moment it is swapped in, and an element that is still at the
                 transparent end of its own animation gets photographed
                 transparent — the logo would blink out mid-morph. It is the
                 anchor of the card, so arriving in place suits it anyway. -->
            <img src="/logo.svg" alt="logo-yada" class="vt-brand-logo h-14 w-auto" />
            <h2
              class="rise mt-3 text-xl font-semibold tracking-tight text-ink lg:mt-5 lg:text-2xl"
              style="--rise-delay: 110ms"
            >
              <!-- Keyed on the mode so the heading is re-created, and therefore
                   animated, when the toggle swaps it out. -->
              {#key mode}
                <span
                  class="block"
                  in:fly={motion({ y: 8, duration: 280, easing: cubicOut })}
                >
                  {#if mode === "reset"}
                    {form?.sent ? "Check your email" : "Reset your password"}
                  {:else}
                    {mode === "sign-up"
                      ? "Create your account"
                      : "Hello! Welcome back"}
                  {/if}
                </span>
              {/key}
            </h2>
            <p
              class="rise mt-1 text-sm leading-relaxed text-ink-secondary lg:mt-1.5"
              style="--rise-delay: 170ms"
            >
              {#if mode === "reset"}
                {form?.sent
                  ? `If an account exists for ${form.email}, we've sent a reset link.`
                  : "Enter the email linked to your account and we'll send you a reset link."}
              {/if}
            </p>
          </div>

          {#if mode === "reset"}
            <form
              method="POST"
              action="?/reset"
              use:enhance={submitReset}
              class="rise mt-5 flex flex-col gap-3 lg:mt-7 lg:gap-4"
              style="--rise-delay: 230ms"
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
                  value={form?.email ?? ""}
                />
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? "Sending…" : "Send reset link"}
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
              action={mode === "sign-up" ? "?/signup" : "?/signin"}
              use:enhance={submitCredentials}
              class="rise mt-5 flex flex-col gap-3 lg:mt-7 lg:gap-4"
              style="--rise-delay: 230ms"
              transition:slide={{ duration: 220 }}
            >
              {#if form?.message}
                <Alert>{form.message}</Alert>
              {:else if resetDone && mode === "sign-in"}
                <Alert variant="success">
                  Your password is saved. Sign in with it.
                </Alert>
              {/if}

              <!-- The mode toggle is a link to the same route, so the <form>
                   itself survives the switch and nothing in it would otherwise
                   be re-created. Keying the body on `mode` makes the swap a
                   create/destroy that a transition can hang off. Only `in:`
                   plays: an outgoing panel would hold its height while the
                   incoming one arrives and bounce the column.

                   The wrapper repeats the form's own column layout so the gaps
                   between fields are unchanged. -->
              {#key mode}
                <div
                  class="flex min-w-0 flex-col gap-3 lg:gap-4"
                  in:fly={motion({ y: 14, duration: 340, easing: cubicOut })}
                >
                  {#if mode === "sign-up"}
                    <fieldset
                      class="grid grid-cols-2 gap-2 rounded-full border border-border bg-surface-sunken p-1"
                    >
                      <legend class="sr-only">I am signing up as</legend>
                      {#each [{ value: "business", label: "Business" }, { value: "courier", label: "Courier" }] as option}
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

                    {#if multiStep}
                      <div class="flex gap-1.5" aria-hidden="true">
                        {#each [0, 1] as index}
                          <span
                            class="h-1 flex-1 rounded-full transition-colors {index <=
                            step
                              ? 'bg-primary'
                              : 'bg-border'}"
                          ></span>
                        {/each}
                      </div>
                    {/if}

                    {#if stepError}
                      <Alert>{stepError}</Alert>
                    {/if}

                    <!-- Step one for a courier; the whole form for a business.
                         `hidden` rather than `{#if}`, so every field stays in the
                         form: a scriptless submit carries all of them at once. -->
                    {#if role === "business" || (role === "courier" && step === 0)}
                      <fieldset
                        bind:this={detailsFields}
                        class="flex min-w-0 flex-col gap-3 lg:gap-4"
                        hidden={multiStep && step !== 0}
                        aria-hidden={multiStep && step !== 0}
                      >
                        <Input
                          label={role === "business"
                            ? "Business Name"
                            : "Full Name"}
                          type="text"
                          name="name"
                          placeholder={role === "business"
                            ? "Favorie Kitchen"
                            : "Kwame Asante"}
                          autocomplete={role === "business"
                            ? "organization"
                            : "name"}
                          required
                          minlength={2}
                          bind:value={name}
                        />
                        <Input
                          label={role === "business" ? "Work email" : "Email"}
                          type="email"
                          name="email"
                          placeholder="Enter your email address"
                          autocomplete="email"
                          required
                          bind:value={email}
                        />
                        <!-- No `maxlength`. It was 10, which fitted `0241234567`
                             and nothing else — not the `+233…` the field now
                             writes as you type, and not the spaced spelling on
                             the placeholder, both of which the server has always
                             accepted. The mask is the length rule now: it stops
                             taking digits at nine. -->
                        <Input
                          label="Phone number"
                          type="tel"
                          name="phone"
                          placeholder="024 123 4567"
                          autocomplete="tel"
                          inputmode="tel"
                          required
                          format={maskPhone}
                          bind:value={phone}
                        />
                        <Input
                          label="Password"
                          type="password"
                          name="password"
                          placeholder={`At least ${data.minPasswordLength} characters`}
                          autocomplete="new-password"
                          minlength={data.minPasswordLength}
                          required
                          bind:value={password}
                        />
                      </fieldset>
                    {:else if role === "courier" && step === 1}
                      <!-- Step two, and the only reason a courier has one. -->
                      <fieldset
                        class="flex min-w-0 flex-col gap-3 lg:gap-4"
                        hidden={multiStep && step !== 1}
                        aria-hidden={multiStep && step !== 1}
                      >
                        <div class="flex flex-col gap-1.5">
                          <Input
                            label="Number plate"
                            type="text"
                            name="plate"
                            placeholder="GT 4521-20"
                            autocapitalize="characters"
                            maxlength={16}
                            required
                            format={maskPlate}
                            bind:value={plate}
                          />
                          <p class="text-xs leading-relaxed text-ink-secondary">
                            Businesses see this while they wait, so they know
                            which bike is yours.
                          </p>
                        </div>

                        <div class="flex flex-col gap-2">
                          <span class="text-sm font-semibold text-ink"
                            >Profile photo</span
                          >
                          <p class="text-xs leading-relaxed text-ink-secondary">
                            Businesses see this when you accept their delivery,
                            so they know who is at the counter.
                          </p>

                          <div class="flex items-center gap-4">
                            <div
                              class="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-sunken"
                            >
                              {#if photo}
                                <img
                                  src={photo}
                                  alt="Your profile"
                                  class="h-full w-full object-cover"
                                />
                              {:else}
                                <IconAccount
                                  class="h-9 w-9 text-ink-disabled"
                                  aria-hidden="true"
                                />
                              {/if}
                            </div>

                            <label
                              class="cursor-pointer rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-wash"
                            >
                              <input
                                type="file"
                                accept="image/*"
                                class="sr-only"
                                onchange={handlePhoto}
                              />
                              {photoBusy
                                ? "Reading…"
                                : photo
                                  ? "Change photo"
                                  : "Choose a photo"}
                            </label>
                          </div>

                          {#if photoError}
                            <p class="text-xs font-medium text-danger">
                              {photoError}
                            </p>
                          {/if}

                          <!-- The photo is resized in the browser and travels as a
                               data URL; there is no upload endpoint behind this. -->
                          <input type="hidden" name="image" value={photo} />
                        </div>
                      </fieldset>
                    {/if}

                    <!-- Navigation. A business never sees it, and neither does
                         anyone with scripting off — both submit the single button. -->
                    {#if multiStep}
                      <div class="flex items-center gap-3">
                        {#if step > 0}
                          <Button
                            variant="neutral"
                            size="lg"
                            onclick={() => (step = 0)}
                          >
                            Back
                          </Button>
                        {/if}
                        <div class="flex-1">
                          {#if onLastStep}
                            <Button
                              variant="primary"
                              size="lg"
                              fullWidth
                              type="submit"
                              disabled={submitting}
                            >
                              {submitting
                                ? "Creating account…"
                                : "Create account"}
                            </Button>
                          {:else}
                            <Button
                              variant="primary"
                              size="lg"
                              fullWidth
                              onclick={nextStep}
                            >
                              Continue
                            </Button>
                          {/if}
                        </div>
                      </div>
                    {:else}
                      <Button
                        variant="primary"
                        size="lg"
                        fullWidth
                        type="submit"
                        disabled={submitting}
                      >
                        {submitting ? "Creating account…" : "Create account"}
                      </Button>
                    {/if}
                  {:else}
                    <Input
                      label="Email"
                      type="email"
                      name="email"
                      placeholder="Enter your email address"
                      autocomplete="email"
                      required
                      bind:value={email}
                    />
                    <Input
                      label="Password"
                      type="password"
                      name="password"
                      placeholder="Enter your password"
                      autocomplete="current-password"
                      required
                      bind:value={password}
                    />

                    <div class="flex items-center justify-between text-sm">
                      <label class="flex items-center gap-2 text-ink-secondary">
                        <input
                          type="checkbox"
                          name="rememberMe"
                          class="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        Remember me
                      </label>
                      <a
                        href="/auth?mode=reset"
                        class="font-medium text-primary hover:underline"
                      >
                        Forgot password?
                      </a>
                    </div>

                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      type="submit"
                      disabled={submitting}
                    >
                      {submitting ? "Signing in…" : "Login"}
                    </Button>
                  {/if}
                </div>
              {/key}
            </form>

            <!-- Google, as its own little form: it posts to its own action, and
                 HTML has no nested forms. The button renders even while the
                 provider is unconfigured — disabled is the honest state for an
                 option that is real and coming but can't be started yet. -->
            <div
              class="rise mt-4 flex flex-col gap-3 lg:mt-5"
              style="--rise-delay: 320ms"
            >
              <div class="flex items-center gap-3" aria-hidden="true">
                <span class="h-px flex-1 bg-border"></span>
                <span class="text-eyebrow text-ink-tertiary">or</span>
                <span class="h-px flex-1 bg-border"></span>
              </div>

              <!-- A Google failure arrives as a redirect back to this page
                   carrying `?error=`, not as a form result — the callback is
                   Better Auth's endpoint and there is no action to fail. It is
                   rendered here rather than with the credential form's errors
                   because it belongs to the button below it. -->
              {#if data.oauthError}
                <Alert>{data.oauthError}</Alert>
              {/if}

              <form method="POST" action="?/google" use:enhance={submitGoogle}>
                <!-- Only meaningful in sign-up mode: that is the only place the
                     Business/Courier toggle is on screen. Blank from the
                     sign-in tab, where nobody chose, and the action treats that
                     as "ask later" rather than assuming business. -->
                <input
                  type="hidden"
                  name="role"
                  value={mode === "sign-up" ? role : ""}
                />
                <button
                  type="submit"
                  disabled={!data.googleEnabled || googlePending}
                  class="inline-flex w-full items-center justify-center gap-3 rounded-md border border-border bg-surface px-4 py-3 text-base font-semibold text-ink transition-colors hover:bg-wash focus-visible:outline focus-visible:outline-3 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <IconGoogle class="h-5 w-5 shrink-0" aria-hidden="true" />
                  {#key mode}
                    <span in:fade={motion({ duration: 260 })}>
                      {googlePending
                        ? "Opening Google…"
                        : mode === "sign-up"
                          ? "Sign up with Google"
                          : "Continue with Google"}
                    </span>
                  {/key}
                </button>
              </form>

              {#if !data.googleEnabled}
                <p class="text-center text-xs text-ink-tertiary">
                  Google sign-in switches on once the OAuth credentials are
                  configured.
                </p>
              {/if}
            </div>

            <div
              class="rise mt-4 flex items-center justify-center gap-2 text-sm text-ink-secondary"
              style="--rise-delay: 390ms"
            >
              {#key mode}
                <span in:fade={motion({ duration: 260 })}
                  >{mode === "sign-up"
                    ? "Already have an account?"
                    : "Don't have an account?"}</span
                >
                <!-- A link, so switching modes works without JavaScript and
                     drops the other mode's error along with the query string. -->
                <a
                  href={mode === "sign-up" ? "/auth" : "/auth?mode=sign-up"}
                  class="font-semibold text-primary underline-offset-2 hover:underline"
                  in:fade={motion({ duration: 260, delay: 60 })}
                >
                  {mode === "sign-up" ? "Sign in" : "Create account"}
                </a>
              {/key}
            </div>
          {/if}
        </div>
      </section>
    </div>
  </div>
</div>

<style>
  @view-transition {
    navigation: auto;
  }
  /* `.rise` and its keyframes now live in app.css, shared with the workspace
     pages. The shapes below stay local — they are this page's decoration. */
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
    .float-shape,
    .pulse-shape,
    .spin-shape,
    .travel-shape {
      animation: none !important;
    }
  }
</style>
