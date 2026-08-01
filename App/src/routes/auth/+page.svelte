<script lang="ts">
  import { enhance } from "$app/forms";
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import Alert from "$lib/components/ui/Alert.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import GoogleButton from "$lib/components/auth/GoogleButton.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import {
    ProfilePhotoError,
    readProfilePhoto,
  } from "$lib/client/images/profile-photo";
  import {
    COURIER_SIGNUP_STEPS,
    COURIER_STEP_COUNT,
    MIN_PASSWORD_LENGTH,
    firstProblem,
    signUpSchema,
  } from "./schemas";
  import { slide } from "svelte/transition";

  type Role = "business" | "courier";
  type Mode = "sign-in" | "sign-up" | "reset";

  /** Whatever the last `fail()` from an action returned, or `{ sent: true }`. */
  let {
    data,
    form,
  }: {
    data: { googleEnabled: boolean };
    form: {
      message?: string;
      email?: string;
      name?: string;
      phone?: string;
      role?: string;
      step?: number;
      sent?: boolean;
    } | null;
  } = $props();

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

  // Role is a radio inside the form: `bind:group` drives the phone field's
  // visibility here, and the same input submits the value to the action.
  let role = $state<Role>(
    page.url.searchParams.get("role") === "courier" ? "courier" : "business",
  );

  $effect(() => {
    if (form?.role === "courier" || form?.role === "business") role = form.role;
  });

  let submitting = $state(false);

  // ---------------------------------------------------------------------------
  // Sign-up steps
  //
  // Only a courier gets them, and only because of the photo: a business signs up
  // with four fields, and splitting those across screens would add clicks and
  // buy nothing. The grouping lives in `./schemas` beside the validation, so the
  // step a field is on and the step a rejected field reopens are the same fact.
  //
  // The dispatch address isn't here either: a business sets it on /request,
  // where the map it gets pinned on is already the page.
  // ---------------------------------------------------------------------------

  let step = $state(0);
  let stepError = $state("");

  // Seeded from `form` at creation, not bound to it: that fills the fields back
  // in after a no-JavaScript round trip, while leaving what someone is currently
  // typing alone — `use:enhance` re-renders this component rather than
  // remounting it. The password is deliberately never restored.
  // svelte-ignore state_referenced_locally
  let email = $state(form?.email ?? "");
  // svelte-ignore state_referenced_locally
  let phone = $state(form?.phone ?? "");
  let password = $state("");
  // svelte-ignore state_referenced_locally
  let name = $state(form?.name ?? "");

  /**
   * The courier's photo, already downscaled to a data URL — see
   * `$lib/client/images/profile-photo` for why it travels as one. Never seeded
   * from `form`: a rejected submit doesn't echo it back, and asking someone to
   * pick the same file twice beats posting a hundred kilobytes back to them.
   */
  let photo = $state("");
  let photoError = $state("");
  let photoBusy = $state(false);

  /**
   * Steps are only *steps* once JavaScript is running. Server-rendered, every
   * fieldset is present and visible, so the form still submits in one go with
   * scripting off — the same reason the mode toggle is a link rather than state.
   */
  let stepped = $state(false);
  onMount(() => {
    stepped = true;
  });

  /** A business fills one screen; only the courier's photo earns a second. */
  const multiStep = $derived(stepped && role === "courier");
  const lastStep = $derived(COURIER_STEP_COUNT - 1);
  const onLastStep = $derived(step >= lastStep);

  // Switching to Business collapses the form, so any step past the first would
  // leave nothing on screen.
  $effect(() => {
    if (role === "business") step = 0;
  });

  /** A rejected submit reopens the step that owns the field it complained about. */
  $effect(() => {
    if (form?.step != null) step = form.step;
  });

  /**
   * Everything the form currently holds, in the shape the schema parses. The
   * same object the action builds from the request body, which is the point:
   * one definition of what is acceptable, checked here for speed and there for
   * real.
   */
  function currentValues() {
    return {
      role,
      name,
      email,
      phone,
      password,
      image: photo || undefined,
    };
  }

  /**
   * Validate, but only report what belongs to `fields` — so someone on the first
   * step isn't told about the photo they haven't reached yet. Passing no field
   * list checks the whole form, which is what submitting does.
   */
  function problemIn(fields?: readonly string[]): string {
    const parsed = signUpSchema.safeParse(currentValues());
    if (parsed.success) return "";

    const issues = fields
      ? parsed.error.issues.filter((issue) =>
          fields.includes(String(issue.path[0] ?? "")),
        )
      : parsed.error.issues;

    return issues[0]?.message ?? "";
  }

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

  function goToStep(next: number) {
    stepError = "";
    step = Math.min(Math.max(next, 0), lastStep);
  }

  function nextStep() {
    const problem = problemIn(COURIER_SIGNUP_STEPS[step]?.fields);
    if (problem) {
      stepError = problem;
      return;
    }

    goToStep(step + 1);
  }

  /**
   * Guard the submit itself: the steps are hidden rather than unmounted, so
   * every field is in the form at all times and a half-filled first step would
   * otherwise reach the server only to be rejected there.
   */
  function handleSubmit(event: SubmitEvent) {
    if (mode !== "sign-up") return;

    const parsed = signUpSchema.safeParse(currentValues());
    if (parsed.success) {
      stepError = "";
      return;
    }

    event.preventDefault();

    const problem = firstProblem(parsed.error);
    stepError = problem.message;
    if (multiStep) step = problem.step;
  }

  /** Flip the pending flag around the request; `update()` applies the result. */
  const track = () => {
    submitting = true;

    return async ({ update }: { update: () => Promise<void> }) => {
      await update();
      submitting = false;
    };
  };

  const dotGrid = Array.from({ length: 20 });
  const miniDotGrid = Array.from({ length: 12 });
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
        class="relative flex shrink-0 items-center justify-between overflow-hidden bg-primary px-5 py-4 lg:hidden"
      >
        <div
          class="pointer-events-none absolute -right-3 -top-3 grid grid-cols-4 gap-1.5 opacity-30"
        >
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
      </section>

      <!-- Desktop-only color panel -->
      <section
        class="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 lg:flex"
      >
        <!-- top-left dot grid -->
        <div class="absolute left-8 top-8 grid grid-cols-5 gap-2.5">
          {#each dotGrid as _}
            <span class="h-1.5 w-1.5 rounded-full bg-primary-on/35"></span>
          {/each}
        </div>

        <!-- floating parcel icon, top-right -->
        <div class="absolute right-10 top-10 float-shape">
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
          <p class="text-eyebrow font-mono text-primary-on/70">
            YADA for teams
          </p>
          <h1
            class="mt-4 max-w-xs text-4xl font-bold leading-tight tracking-tight text-primary-on"
          >
            Every delivery,<br />on time.
          </h1>
          <p class="mt-4 max-w-xs text-sm leading-relaxed text-primary-on/80">
            Sign in to manage orders, track couriers, and keep customers in the
            loop.
          </p>
        </div>

        <!-- traveling courier dot along a dashed route -->
        <div
          class="relative z-10 mt-10 h-px w-full border-t-2 border-dashed border-primary-on/35"
        >
          <span
            class="absolute -top-[5px] h-2.5 w-2.5 rounded-full bg-primary-on travel-shape"
          ></span>
        </div>

        <!-- route/tracking motif, bottom -->
        <div class="relative z-10 mt-8 flex items-center gap-4">
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
            {#each Array.from({ length: 12 }) as _}
              <span class="h-1.5 w-1.5 rounded-full bg-primary-on/35"></span>
            {/each}
          </div>
        </div>
      </section>

      <!-- Auth form -->
      <section
        class="flex flex-col justify-center p-5 sm:p-6 lg:items-center lg:p-12"
      >
        <div class="mx-auto w-full max-w-sm">
          <div class="flex flex-col items-center text-center">
            <img src="/logo.svg" alt="logo-yada" class="h-14 w-auto" />
            <h2
              class="mt-3 text-xl font-semibold tracking-tight text-ink lg:mt-5 lg:text-2xl"
            >
              {#if mode === "reset"}
                {form?.sent ? "Check your email" : "Reset your password"}
              {:else}
                {mode === "sign-up"
                  ? "Create your account"
                  : "Hello! Welcome back"}
              {/if}
            </h2>
            <p
              class="mt-1 text-sm leading-relaxed text-ink-secondary lg:mt-1.5"
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
              use:enhance={track}
              onsubmit={handleSubmit}
              class="mt-5 flex flex-col gap-3 lg:mt-7 lg:gap-4"
              transition:slide={{ duration: 220 }}
            >
              {#if form?.message}
                <Alert>{form.message}</Alert>
              {/if}

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
                    {#each COURIER_SIGNUP_STEPS as _, index}
                      <span
                        class="h-1 flex-1 rounded-full transition-colors {index <=
                        step
                          ? 'bg-primary'
                          : 'bg-neutral-200'}"
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
                <div
                  class="flex flex-col gap-3 lg:gap-4"
                  hidden={multiStep && step !== 0}
                  aria-hidden={multiStep && step !== 0}
                >
                    {#if role === "business"}
                      <Input
                        label="Business name"
                        type="text"
                        name="name"
                        placeholder="Favorie Kitchen"
                        autocomplete="organization"
                        required
                        bind:value={name}
                      />
                    {:else}
                      <Input
                        label="Full name"
                        type="text"
                        name="name"
                        placeholder="Kwame Asante"
                        autocomplete="name"
                        required
                        bind:value={name}
                      />
                    {/if}
                    <Input
                      label={role === "business" ? "Work email" : "Email"}
                      type="email"
                      name="email"
                      placeholder="Enter your email address"
                      autocomplete="email"
                      required
                      bind:value={email}
                    />
                    <Input
                      label="Phone number"
                      type="tel"
                      name="phone"
                      placeholder="024 123 4567"
                      autocomplete="tel"
                      inputmode="tel"
                      maxlength={17}
                      required
                      bind:value={phone}
                    />
                    <Input
                      label="Password"
                      type="password"
                      name="password"
                      placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                      autocomplete="new-password"
                      minlength={MIN_PASSWORD_LENGTH}
                      required
                      bind:value={password}
                    />
                  </div>

                {#if role === "courier"}
                  <!-- Step two, and the only reason a courier has one. -->
                  <div
                    class="flex flex-col gap-3 lg:gap-4"
                    hidden={multiStep && step !== 1}
                    aria-hidden={multiStep && step !== 1}
                  >
                      <div class="flex flex-col gap-2">
                        <span class="text-sm font-semibold text-ink"
                          >Profile photo</span
                        >
                        <p class="text-xs leading-relaxed text-ink-secondary">
                          Businesses see this when you accept their delivery, so
                          they know who is at the counter.
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
                              <svg
                                viewBox="0 0 24 24"
                                class="h-8 w-8 text-ink-disabled"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1.5"
                                aria-hidden="true"
                              >
                                <circle cx="12" cy="8" r="4" /><path
                                  d="M4 21a8 8 0 0 1 16 0"
                                />
                              </svg>
                            {/if}
                          </div>

                          <label
                            class="cursor-pointer rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-neutral-50"
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

                        <!-- The photo is resized in the browser and travels as a data URL;
											     there is no upload endpoint or bucket behind this. -->
                        <input type="hidden" name="image" value={photo} />
                      </div>
                  </div>
                {/if}

                <!-- Navigation. A business never sees it, and neither does anyone
                     with scripting off — both submit the single button below. -->
                {#if multiStep}
                  <div class="flex items-center gap-3">
                    {#if step > 0}
                      <Button
                        variant="ghost"
                        size="lg"
                        onclick={() => goToStep(step - 1)}
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
                          {submitting ? "Creating account…" : "Create account"}
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
            </form>

            <!-- Beside the credentials form, not inside it: HTML has no nested forms,
						     and this posts to its own action. -->
            <div class="mt-4 flex flex-col gap-3 lg:mt-5">
              <div class="flex items-center gap-3" aria-hidden="true">
                <span class="h-px flex-1 bg-border"></span>
                <span class="text-eyebrow text-ink-tertiary">or</span>
                <span class="h-px flex-1 bg-border"></span>
              </div>

              <GoogleButton
                enabled={data.googleEnabled}
                {role}
                label={mode === "sign-up"
                  ? "Sign up with Google"
                  : "Continue with Google"}
              />
            </div>

            <div
              class="mt-4 flex items-center justify-center gap-2 text-sm text-ink-secondary"
            >
              <span
                >{mode === "sign-up"
                  ? "Already have an account?"
                  : "Don't have an account?"}</span
              >
              <!-- A link, so switching modes works without JavaScript and drops the
							     other mode's error along with the query string. -->
              <a
                href={mode === "sign-up" ? "/auth" : "/auth?mode=sign-up"}
                class="font-semibold text-primary underline-offset-2 hover:underline"
              >
                {mode === "sign-up" ? "Sign in" : "Create account"}
              </a>
            </div>
          {/if}
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
