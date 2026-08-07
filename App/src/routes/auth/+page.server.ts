import { fail, redirect } from "@sveltejs/kit";
import { APIError } from "better-auth/api";
import { z } from "zod";

import { env } from "$env/dynamic/private";

import { saveCourierProfile, setCourierAvailability } from "$lib/server/data/courier";
// The photo rules are shared with PUT /api/account/photo, which writes the same
// column; see $lib/server/validation/photo.
import { photoDataUrl as photo } from "$lib/server/validation/photo";

import { auth, toAuthRole } from "./auth.server";
import { authErrorMessage } from "./errors";
import type { Actions } from "./$types";

/**
 * Where a role belongs once signed in — couriers to their home, everyone else
 * to the dashboard. The workspace layout gates and the landing page carry the
 * same two URLs inline; this helper exists because this file redirects on
 * three separate paths.
 */
function homeFor(role: string | null | undefined) {
  return role === "courier" ? "/home" : "/dashboard";
}

// ---------------------------------------------------------------------------
// Input schemas
//
// The actions below are the only place these run: with `use:enhance`, a
// rejected submit comes back as the `form` prop without a page load, so the
// browser-side "validation" the page does is limited to what HTML constraint
// attributes already express. Everything that involves an actual rule — what a
// Ghanaian phone number is, what may sit in the image column — lives here,
// where it can't be bypassed.
// ---------------------------------------------------------------------------

/** Better Auth's default `minPasswordLength`. Sent to the page via `load`. */
const MIN_PASSWORD_LENGTH = 8;

const email = z.email("Enter a valid email address.");

/**
 * A Ghanaian mobile number, normalised to E.164.
 *
 * `users.phone_number` is unique, so "0244123456" and "+233244123456" would
 * otherwise be two accounts for one phone. Accepting the spellings people
 * actually type and storing one of them is the point of parsing rather than
 * merely checking.
 */
const phone = z
  .string()
  .transform((value) => value.replace(/[^\d+]/g, ""))
  .refine((value) => /^(0\d{9}|\+?233\d{9})$/.test(value), {
    message: "Enter a 10-digit phone number, like 024 123 4567.",
  })
  .transform((value) => `+233${value.replace(/^(\+?233|0)/, "")}`);

const password = z
  .string()
  .min(
    MIN_PASSWORD_LENGTH,
    `Your password is too short — use at least ${MIN_PASSWORD_LENGTH} characters.`,
  );

const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
  rememberMe: z.boolean(),
});

const resetSchema = z.object({ email });

const signUpSchema = z
  .object({
    role: z.enum(["business", "courier"]),
    name: z.string().trim(),
    email,
    phone,
    password,
    /** Empty string from a form field with nothing in it; absent for a business. */
    image: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    // Role-dependent, so it can't be a `.min()` on the field: a business is
    // asked for its trading name and a courier for the name on their ID.
    if (value.name.length < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["name"],
        message:
          value.role === "business"
            ? "Enter your business name."
            : "Enter your full name.",
      });
    }

    if (value.role !== "courier") return;

    // SRS 3.1: a courier registers with a profile photograph, and SRS 3.3 shows
    // it to the business on acceptance. So it is part of the account, not a
    // decoration to be filled in later.
    if (!value.image) {
      ctx.addIssue({
        code: "custom",
        path: ["image"],
        message: "Add a profile photo so businesses can recognise you.",
      });
      return;
    }

    const parsed = photo.safeParse(value.image);
    if (!parsed.success) {
      ctx.addIssue({
        code: "custom",
        path: ["image"],
        message: parsed.error.issues[0].message,
      });
    }
  });

/**
 * Which sign-up step owns each field, for a courier — the only role with steps.
 * A rejected field reopens the step it is rendered on; anything unknown falls
 * to the first.
 */
const STEP_FOR_FIELD: Record<string, number> = {
  name: 0,
  email: 0,
  phone: 0,
  password: 0,
  image: 1,
};

/**
 * The first complaint, as the form shows it: a message and the step to reopen.
 * Issues come back in field order, which is the order they are rendered, so the
 * first one is the one nearest the top of the form.
 */
function firstProblem(error: z.ZodError) {
  const issue = error.issues[0];

  return {
    message: issue.message,
    step: STEP_FOR_FIELD[String(issue.path[0] ?? "")] ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * What the form gets back after a rejected submit: the values worth restoring,
 * plus which step to reopen on. The step matters because a courier's sign-up is
 * two screens — a rejected email is on the first, and dropping the visitor on
 * the second leaves them staring at a field that is perfectly fine.
 */
type Fields = {
  email?: string;
  name?: string;
  phone?: string;
  role?: string;
  step?: number;
};

/** Whether Google sign-in can actually be started. */
function googleConfigured() {
  return Boolean(env.OAUTH_GOOGLE_CLIENT_ID && env.OAUTH_GOOGLE_CLIENT_SECRET);
}

/**
 * Turn a thrown Better Auth error into copy for the form.
 *
 * `auth.api.*` throws `APIError` rather than returning a response, and its
 * `body.code` is the vocabulary `./errors` maps to plain copy — those are the
 * provider's answers ("this email is taken"), not shapes of input, which is why
 * no schema above covers them. Anything that isn't an `APIError` is a bug, not
 * a rejected credential, and is re-thrown.
 */
function messageFor(error: unknown, fallback: string) {
  if (!(error instanceof APIError)) return null;

  const body = error.body as { code?: string } | undefined;
  return authErrorMessage(
    body?.code ?? null,
    error.statusCode ?? null,
    fallback,
  );
}

export async function load({ locals }) {
  if (locals.user) {
    redirect(303, homeFor(locals.user.role));
  }

  // The Google button renders either way — it is part of the page's shape, and
  // hiding it until credentials exist would mean nobody sees the layout it
  // belongs to. Disabled is the honest state for a provider that can't be
  // reached yet. The password length rides along so the page's copy and
  // `minlength` can't drift from the rule enforced here.
  return {
    googleEnabled: googleConfigured(),
    minPasswordLength: MIN_PASSWORD_LENGTH,
  };
}

export const actions = {
  signin: async ({ request }) => {
    const data = await request.formData();
    const fields: Fields = { email: String(data.get("email") ?? "").trim() };

    const parsed = signInSchema.safeParse({
      email: data.get("email"),
      password: data.get("password"),
      rememberMe: data.get("rememberMe") === "on",
    });

    if (!parsed.success) {
      return fail(400, {
        ...fields,
        message: firstProblem(parsed.error).message,
      });
    }

    const { email, password, rememberMe } = parsed.data;

    try {
      // The `sveltekitCookies` plugin turns the Set-Cookie this produces into
      // `event.cookies.set`, so the session rides out on the redirect below.
      await auth.api.signInEmail({
        body: { email, password, rememberMe },
        headers: request.headers,
      });
    } catch (error) {
      const message = messageFor(error, "Unable to sign in.");
      if (message === null) throw error;

      return fail(400, { ...fields, message });
    }

    // Read the role from the session that was just created rather than trusting
    // anything the form said — the form never says.
    const session = await auth.api.getSession({ headers: request.headers });

    redirect(
      303,
      homeFor(session?.user ? toAuthRole(session.user.role) : null),
    );
  },

  signup: async ({ request }) => {
    const data = await request.formData();
    // `toAuthRole` clamps anything unexpected to `business`; the create hook in
    // ./auth.server clamps it again, so a forged value can't mint an admin.
    const role = toAuthRole(data.get("role"));

    // Echoed back on a rejection so the form can refill itself, straight off
    // the request rather than from the parse — a value the schema rejected is
    // exactly the one the visitor needs to see and correct.
    const fields: Fields = {
      email: String(data.get("email") ?? "").trim(),
      name: String(data.get("name") ?? "").trim(),
      phone: String(data.get("phone") ?? "").trim(),
      role,
    };

    const parsed = signUpSchema.safeParse({
      role,
      name: data.get("name") ?? "",
      email: data.get("email") ?? "",
      phone: data.get("phone") ?? "",
      password: data.get("password") ?? "",
      image: String(data.get("image") ?? "").trim() || undefined,
    });

    if (!parsed.success) {
      // The step comes from which field failed, so a courier is returned to the
      // half of the form the problem is actually on.
      const problem = firstProblem(parsed.error);
      return fail(400, {
        ...fields,
        step: problem.step,
        message: problem.message,
      });
    }

    // `phone` comes back normalised to +233…, which is what makes the unique
    // constraint on that column mean one number per account.
    const { name, email, phone, password, image } = parsed.data;

    let createdUserId: string;

    try {
      const created = await auth.api.signUpEmail({
        body: {
          email,
          password,
          name,
          // `role` is declared `input: false`, so Better Auth drops it from the
          // *typed* body — but the `user.create.before` hook in ./auth.server
          // reads it off the raw body and clamps it through `toAuthRole`. Passing
          // it here is how sign-up picks a workspace; the cast only silences the
          // narrowed type, it doesn't widen what the server will accept.
          role,
          phoneNumber: phone,
          // `image` is a Better Auth user field, so it needs no hook of its own.
          ...(role === "courier" && image ? { image } : {}),
        } as unknown as NonNullable<
          Parameters<typeof auth.api.signUpEmail>[0]
        >["body"],
        headers: request.headers,
      });

      createdUserId = created.user.id;
    } catch (error) {
      const message = messageFor(error, "Unable to create your account.");
      if (message === null) throw error;

      // Better Auth rejects on the credentials — a taken email, a password it
      // dislikes — which live on the first step either way.
      return fail(400, { ...fields, step: 0, message });
    }

    // Outside the block above so a failure here isn't reported as a rejected
    // credential: the account exists by this point, and a profile that didn't
    // write is a server fault, not something the visitor can fix by retyping.
    //
    // A business has no row to write yet — its dispatch address is set on
    // /request, on the map it gets pinned on.
    if (role === "courier") {
      await saveCourierProfile(createdUserId);
    }

    redirect(303, homeFor(role));
  },

  /**
   * Start the Google flow.
   *
   * A form action rather than a client call, so the button is an ordinary
   * submit: `signInSocial` hands back the provider's authorize URL and this
   * redirects to it, which works the same with JavaScript off.
   *
   * Known gap for when the credentials land: a social sign-up has no role on it,
   * and `user.create.before` in ./auth.server clamps a missing role to
   * `business`. So this creates business accounts. A courier arriving through
   * Google needs the intended role carried across the redirect — or a "which are
   * you?" prompt on first landing — before the button is offered on their side.
   */
  /**
   * Sign out, on the server.
   *
   * Deliberately an action rather than the client `session.signOut()` it
   * replaces. Two things have to be true when someone signs out, and only this
   * side can guarantee either: the session row is deleted, so a cookie that
   * survives the round trip authenticates nothing; and the cookie deletion
   * rides on a navigation the browser has to apply, rather than on a fetch that
   * a closing tab or a dropped connection can abandon halfway. The old path
   * cleared local state in a `finally` and redirected regardless — so a failed
   * request left a live session behind and a UI that claimed otherwise, which
   * is exactly how you get signed back in on the next visit.
   *
   * The redirect goes to /auth rather than the landing page: signing out is
   * nearly always a prelude to signing in as someone else.
   */
  signout: async ({ request, locals }) => {
    // Clocking off is part of signing off. This used to be a fire-and-forget
    // fetch from the button, racing the navigation that followed it — a courier
    // whose request lost that race stayed `active` in the table, and dispatch
    // kept ringing a phone nobody was holding.
    if (locals.user?.role === "courier") {
      await setCourierAvailability(locals.user.id, false);
    }

    try {
      await auth.api.signOut({ headers: request.headers });
    } catch (error) {
      // A session that was already gone is a signed-out user, which is the
      // outcome being asked for. Anything else is worth knowing about, but not
      // worth stranding someone on a page they asked to leave.
      console.error("Sign-out failed.", error);
    }

    redirect(303, "/auth");
  },

  google: async ({ request, url }) => {
    if (!googleConfigured()) {
      return fail(400, {
        message:
          "Google sign-in is not configured yet — use your email and password for now.",
      });
    }

    let authorizeUrl: string | undefined;

    try {
      ({ url: authorizeUrl } = await auth.api.signInSocial({
        body: {
          provider: "google",
          callbackURL: `${url.origin}/dashboard`,
          errorCallbackURL: `${url.origin}/auth`,
        },
        headers: request.headers,
      }));
    } catch (error) {
      const message = messageFor(error, "Unable to start Google sign-in.");
      if (message === null) throw error;

      return fail(400, { message });
    }

    if (!authorizeUrl) {
      return fail(502, {
        message: "Google did not return a sign-in link. Try again.",
      });
    }

    // Outside the block above: `redirect` works by throwing, and inside a catch
    // that inspects errors it would be mistaken for a failure.
    redirect(303, authorizeUrl);
  },

  reset: async ({ request, url }) => {
    const data = await request.formData();
    const typed = String(data.get("email") ?? "").trim();

    const parsed = resetSchema.safeParse({ email: data.get("email") });
    if (!parsed.success) {
      return fail(400, {
        email: typed,
        message: firstProblem(parsed.error).message,
      });
    }

    const { email } = parsed.data;

    try {
      await auth.api.requestPasswordReset({
        body: { email, redirectTo: `${url.origin}/reset-password` },
        headers: request.headers,
      });
    } catch (error) {
      const message = messageFor(error, "Unable to send a reset link.");
      if (message === null) throw error;

      return fail(400, { email, message });
    }

    // Deliberately not "we sent it": saying so for any address would tell an
    // attacker which emails have accounts.
    return { email, sent: true };
  },
} satisfies Actions;
