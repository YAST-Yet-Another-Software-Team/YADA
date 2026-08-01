/**
 * What the auth forms accept, as schemas rather than as a run of `if`s.
 *
 * One definition, parsed on both sides: the browser runs it to tell someone
 * about an empty field on the step that field is on, and the action runs it
 * again because nothing arriving over HTTP is trustworthy. Before this, those
 * two lived apart — hand-written checks in `+page.server.ts` and a second set in
 * the component — and the only thing keeping them in agreement was that the same
 * person wrote both on the same afternoon.
 *
 * Note what this does *not* replace: `./errors`. That maps Better Auth's own
 * failure codes ("this email is taken", "session not fresh") to copy, and those
 * are answers from the provider, not shapes of input — no schema can see them.
 */

import { z } from 'zod';

/** Better Auth's default `minPasswordLength`. Mirrored so the copy matches. */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * A 256 px JPEG lands well under this. The cap exists so a hand-written request
 * can't park a megabyte in the `users.image` text column.
 */
export const MAX_PHOTO_DATA_URL_LENGTH = 150_000;

export const AUTH_ROLES = ['business', 'courier'] as const;

// ---------------------------------------------------------------------------
// Fields
// ---------------------------------------------------------------------------

const email = z.email('Enter a valid email address.');

/**
 * A Ghanaian mobile number, normalised to E.164.
 *
 * `users.phone_number` is unique, so "0244123456" and "+233244123456" would
 * otherwise be two accounts for one phone. Accepting all three spellings people
 * actually type and storing one of them is the point of parsing rather than
 * merely checking.
 */
const phone = z
  .string()
  .transform((value) => value.replace(/[^\d+]/g, ''))
  .refine((value) => /^(0\d{9}|\+?233\d{9})$/.test(value), {
    message: 'Enter a 10-digit phone number, like 024 123 4567.'
  })
  .transform((value) => `+233${value.replace(/^(\+?233|0)/, '')}`);

const password = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Your password is too short — use at least ${MIN_PASSWORD_LENGTH} characters.`);

/**
 * The courier's photo, as the data URL `$lib/client/images/profile-photo`
 * produces. The scheme is restricted because this string ends up in an
 * `<img src>`: `data:image/...` cannot carry script, `data:text/html` can.
 */
const photo = z
  .string()
  .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, {
    message: "We couldn't accept that photo. Choose a different one."
  })
  .max(MAX_PHOTO_DATA_URL_LENGTH, 'That photo is too large. Choose a smaller one.');

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password.'),
  rememberMe: z.boolean().default(false)
});

export const resetSchema = z.object({ email });

export const signUpSchema = z
  .object({
    role: z.enum(AUTH_ROLES),
    name: z.string().trim(),
    email,
    phone,
    password,
    /** Empty string from a form field with nothing in it; absent for a business. */
    image: z.string().optional()
  })
  .superRefine((value, ctx) => {
    // Role-dependent, so it can't be a `.min()` on the field: a business is
    // asked for its trading name and a courier for the name on their ID.
    if (value.name.length < 2) {
      ctx.addIssue({
        code: 'custom',
        path: ['name'],
        message: value.role === 'business' ? 'Enter your business name.' : 'Enter your full name.'
      });
    }

    if (value.role !== 'courier') return;

    // SRS 3.1: a courier registers with a profile photograph, and SRS 3.3 shows
    // it to the business on acceptance. So it is part of the account, not a
    // decoration to be filled in later.
    if (!value.image) {
      ctx.addIssue({
        code: 'custom',
        path: ['image'],
        message: 'Add a profile photo so businesses can recognise you.'
      });
      return;
    }

    const parsed = photo.safeParse(value.image);
    if (!parsed.success) {
      ctx.addIssue({ code: 'custom', path: ['image'], message: parsed.error.issues[0].message });
    }
  });

export type SignUpInput = z.infer<typeof signUpSchema>;

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

/**
 * Only a courier signs up in stages, and only because of the photo: a business
 * has four fields and a single column holds them comfortably. Splitting a short
 * form into steps adds clicks and buys nothing.
 *
 * The grouping is the same data the form renders from and the action maps
 * errors through, so a rejected field always reopens the step it lives on.
 */
export const COURIER_SIGNUP_STEPS = [
  { id: 'details', fields: ['name', 'email', 'phone', 'password'] },
  { id: 'photo', fields: ['image'] }
] as const;

export const COURIER_STEP_COUNT = COURIER_SIGNUP_STEPS.length;

/** Which step a field belongs to. Unknown fields fall to the first. */
export function stepForField(field: string | undefined) {
  const index = COURIER_SIGNUP_STEPS.findIndex((step) =>
    (step.fields as readonly string[]).includes(field ?? '')
  );

  return index === -1 ? 0 : index;
}

/**
 * The first complaint, as the form shows it: a message and the step to reopen.
 *
 * Issues come back in field order, which is the order they are rendered, so the
 * first one is the one nearest the top of the form.
 */
export function firstProblem(error: z.ZodError) {
  const issue = error.issues[0];

  return {
    message: issue.message,
    field: String(issue.path[0] ?? ''),
    step: stepForField(String(issue.path[0] ?? ''))
  };
}
