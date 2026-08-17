import { json } from '@sveltejs/kit';

/**
 * The error envelope every `/api` route answers with: `ok` for the happy-path
 * check, `code` for programmatic handling, `message` for display.
 *
 * Auth checks are not this module's job: each `/api` route reads `locals.user`
 * and answers denials with this envelope inline.
 */
export function apiError(status: number, code: string, message: string) {
  return json({ ok: false, code, message }, { status });
}

/**
 * The refusal an unconfirmed email earns.
 *
 * Confirmation is a soft gate — it never blocks sign-in, and an unverified
 * account can read its whole workspace. What it blocks is the handful of
 * actions that reach other people: a delivery request that rings couriers, and
 * a courier making themselves available to be rung. Both are worth knowing an
 * address is real for.
 *
 * `action` is a gerund phrase: "sending a delivery", "going online".
 */
export function emailUnverified(action: string) {
  return apiError(
    403,
    'email_unverified',
    `Confirm your email before ${action}. Check your inbox for the link.`
  );
}
