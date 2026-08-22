/**
 * Turning auth failures into something a user can act on.
 *
 * Better Auth answers a failed request with `{ code, message }`, where the
 * message is developer English — "Invalid email or password", "Credential
 * account not found", "Field not allowed to be set". Surfacing that verbatim is
 * only marginally better than the silence it replaces, so the codes this app can
 * actually reach are mapped to plain copy here, once, at the point the response
 * is parsed. Every caller then just renders `error.message`.
 *
 * Unmapped codes fall back to the HTTP status, and an unrecognised status falls
 * back to a generic line — so a Better Auth upgrade that introduces a new code
 * degrades to vague, never back to nothing.
 */

/** An auth request that failed, carrying enough to distinguish the reasons. */
export class AuthError extends Error {
  /** Better Auth's error code, or `NETWORK` when the request never landed. */
  readonly code: string | null;
  /** HTTP status, or `null` for a request that never got a response. */
  readonly status: number | null;

  constructor(
    message: string,
    code: string | null = null,
    status: number | null = null,
  ) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Copy per Better Auth error code.
 *
 * Only codes reachable from this app's flows — email sign-in, sign-up, profile
 * update, password change, password reset, email confirmation — are listed.
 *
 * `EMAIL_NOT_VERIFIED` is one Better Auth raises when `requireEmailVerification`
 * is on. It is deliberately off here: confirmation is a soft gate that blocks
 * two actions rather than sign-in (see $lib/server/api-guard). The copy stays
 * so that turning the hard gate on is a config change and not a mystery
 * failure.
 */
const MESSAGE_BY_CODE: Record<string, string> = {
  // Sign in
  INVALID_EMAIL_OR_PASSWORD: "That email and password don't match an account.",
  INVALID_EMAIL: "Enter a valid email address.",
  EMAIL_NOT_VERIFIED:
    "Verify your email address before signing in — check your inbox.",
  EMAIL_PASSWORD_DISABLED: "Email sign-in is unavailable right now.",
  FAILED_TO_CREATE_SESSION: "We couldn't start your session. Try again.",

  // Sign up
  USER_ALREADY_EXISTS: "An account already uses this email. Sign in instead.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    "An account already uses this email. Sign in instead.",
  FAILED_TO_CREATE_USER: "We couldn't create your account. Try again.",
  PASSWORD_TOO_SHORT: "Your password is too short — use at least 8 characters.",
  PASSWORD_TOO_LONG: "Your password is too long.",

  // Profile and password changes
  INVALID_PASSWORD: "Your current password is incorrect.",
  CREDENTIAL_ACCOUNT_NOT_FOUND:
    "This account doesn't use a password. Sign in the way you signed up.",
  EMAIL_CAN_NOT_BE_UPDATED: "Your email can't be changed here.",
  FIELD_NOT_ALLOWED: "That field can't be changed here.",
  USER_NOT_FOUND: "We could not find that account.",
  SESSION_EXPIRED: "Your session expired. Sign in again to continue.",
  SESSION_NOT_FRESH: "Sign in again to confirm this change.",

  // Password reset and email confirmation. Both hand out one-shot tokens, so
  // INVALID_TOKEN and TOKEN_EXPIRED are shared and worded to fit either — a
  // reset link that has already been spent reports as invalid, not expired.
  //
  // RESET_PASSWORD_DISABLED means `sendResetPassword` is missing from the auth
  // config. That is a deployment fault rather than a missing feature now, so
  // the copy says "temporarily" instead of sending people to support.
  RESET_PASSWORD_DISABLED:
    "Password reset is temporarily unavailable. Try again shortly.",
  VERIFICATION_EMAIL_NOT_ENABLED:
    "Email confirmation is temporarily unavailable. Try again shortly.",
  INVALID_TOKEN: "That link is invalid. Request a new one.",
  TOKEN_EXPIRED: "That link has expired. Request a new one.",
  EMAIL_ALREADY_VERIFIED: "That email is already confirmed. You're all set.",
  EMAIL_MISMATCH:
    "That link was sent to a different account. Sign in as that one, or request a new link.",

  // Request shape / origin
  VALIDATION_ERROR: "Check the details you entered and try again.",
  MISSING_FIELD: "Fill in every field and try again.",
  INVALID_ORIGIN:
    "Your browser blocked that request. Reload the page and try again.",
  INVALID_CALLBACK_URL: "That link is malformed. Request a new one.",
  CROSS_SITE_NAVIGATION_LOGIN_BLOCKED:
    "Your browser blocked that request. Reload the page and try again.",
};

/**
 * Copy per OAuth callback error code.
 *
 * A different vocabulary from `MESSAGE_BY_CODE` above, and it has to be: the
 * OAuth callback never throws an `APIError` a caller could catch. It redirects,
 * putting a *lowercase* code in `?error=` on the way to the error URL — see
 * `redirectOnError` in better-auth's oauth2/errors. So these arrive as query
 * strings on a GET of /auth, not as exceptions, and nothing in the UPPER_SNAKE
 * map would ever match them.
 *
 * `state_mismatch` is the one worth reading twice. Better Auth stores the
 * signed `state` in the verifications table and *consumes it on the way in* —
 * before the code is even exchanged. So the code means one of:
 *
 *   - the row expired (10 minutes from the moment the button was pressed);
 *   - the cookie holding the same value expired (5 minutes, until this app
 *     widened it — see `advanced.cookies.state` in ./auth.server);
 *   - the callback URL was opened twice — a refresh, or Back onto it — and the
 *     first visit already spent the state.
 *
 * All three are "start again", which is what the copy says. It deliberately
 * does not say "expired": a replayed callback has not expired, and the user
 * cannot tell the difference anyway.
 */
const OAUTH_MESSAGE_BY_CODE: Record<string, string> = {
  state_mismatch:
    "That sign-in link was already used or took too long. Tap Continue with Google to start again.",
  state_not_found:
    "That sign-in didn't carry its security token. Tap Continue with Google to start again.",
  invalid_code:
    "Google didn't accept that sign-in. Tap Continue with Google to start again.",
  no_code: "Google didn't send anything back. Try again.",
  invalid_callback_request: "That sign-in link is malformed. Try again.",
  // Provider-side refusals: Google puts these in `?error=` itself and Better
  // Auth passes them straight through.
  access_denied: "You cancelled the Google sign-in. Nothing was changed.",
  admin_policy_enforced:
    "Your Google account's administrator blocks sign-ins to YADA.",
  email_not_found:
    "Google didn't share an email address for that account, so we can't create your account.",
  unable_to_get_user_info:
    "We couldn't read your Google profile. Try again in a moment.",
  // "isn't configured on this server" is what this used to say. It is a
  // deployment detail — it tells a reader which secrets are missing and
  // therefore which build they are talking to. Unavailable is all a user can
  // act on either way.
  oauth_provider_not_found: "Google sign-in isn't available right now.",
  signup_disabled: "New accounts can't be created with Google right now.",
  unable_to_link_account:
    "That Google account is already linked to a different YADA account.",
  account_already_linked_to_different_user:
    "That Google account is already linked to a different YADA account.",
  internal_server_error:
    "Something went wrong on our end during sign-in. Try again in a moment.",
};

/**
 * Display copy for an `?error=` code on the sign-in page, or `null` when the
 * parameter is absent.
 *
 * Unknown codes get a generic line rather than `null`: landing back on /auth
 * with no explanation is the failure this exists to end, and a vague reason
 * still beats a silent bounce.
 */
export function oauthErrorMessage(code: string | null | undefined) {
  if (!code) return null;

  return (
    OAUTH_MESSAGE_BY_CODE[code] ??
    "We couldn't finish signing you in with Google. Try again."
  );
}

/**
 * The single answer every rejected sign-in gets, whatever was actually wrong.
 *
 * Better Auth distinguishes "no such user" from "wrong password" from "that
 * address has no password because it signed up with Google", and each of those
 * is a question an attacker can ask a login form and get a straight answer to.
 * Together they turn /auth into a directory: which addresses have accounts, and
 * which of those are Google-only and so worth phishing rather than guessing.
 *
 * So the sign-in form gives one line for all of them. It is deliberately vague
 * about *which* half is wrong, and deliberately says "details" rather than
 * "email or password" — naming the two fields invites the reader to work out
 * which one it was.
 */
export const SIGN_IN_REFUSAL =
  "Those details don't match an account. Check them and try again.";

/**
 * The codes that mean "we are not letting you in", collapsed to one answer.
 *
 * Only refusals belong here. A rate limit, a disabled provider or a failure to
 * write the session say nothing about whether an account exists, and hiding
 * those behind the same line would leave someone retyping a correct password
 * at a server that is simply busy.
 *
 * `EMAIL_NOT_VERIFIED` is on the list even though this app's confirmation is a
 * soft gate that never raises it (see `emailVerification` in ./auth.server).
 * Turning the hard gate on should not quietly reopen the oracle.
 */
const SIGN_IN_OPAQUE_CODES = new Set([
  "INVALID_EMAIL_OR_PASSWORD",
  "INVALID_PASSWORD",
  "USER_NOT_FOUND",
  "USER_EMAIL_NOT_FOUND",
  "ACCOUNT_NOT_FOUND",
  "CREDENTIAL_ACCOUNT_NOT_FOUND",
  "EMAIL_NOT_VERIFIED",
]);

/**
 * Copy for a failed *sign-in*, as opposed to any other auth request.
 *
 * The same codes stay explicit everywhere else, and should: on the
 * change-password form `INVALID_PASSWORD` is talking to someone already holding
 * that account's session, so vagueness there protects nothing and costs them a
 * guess. It is only the unauthenticated front door that has to be uniform.
 *
 * A 401 or 403 with an unmapped code already falls through to a generic line in
 * `messageForStatus`, so the set above only has to cover the codes that would
 * otherwise be specific.
 */
export function signInErrorMessage(
  code: string | null,
  status: number | null,
  fallback: string,
) {
  if (code && SIGN_IN_OPAQUE_CODES.has(code)) return SIGN_IN_REFUSAL;

  return authErrorMessage(code, status, fallback);
}

/** Copy for a status we got but a code we don't recognise. */
function messageForStatus(status: number | null) {
  if (status === null) return null;
  if (status === 404) return "That isn't available yet.";
  if (status === 429) return "Too many attempts. Wait a moment and try again.";
  if (status >= 500)
    return "Something went wrong on our end. Try again in a moment.";
  if (status === 401 || status === 403)
    return "Those details were not accepted.";
  if (status >= 400) return "Check the details you entered and try again.";
  return null;
}

/** The reason to show, given whatever the response actually carried. */
export function authErrorMessage(
  code: string | null,
  status: number | null,
  fallback: string,
) {
  return (
    (code && MESSAGE_BY_CODE[code]) || messageForStatus(status) || fallback
  );
}

/**
 * Display copy for whatever a `catch` block received.
 *
 * Only `AuthError` is trusted, because only `AuthError` is known to have been
 * written for a user to read. An unexpected runtime error still reaches the
 * console, but the screen gets the fallback rather than a stack-shaped sentence.
 */
export function messageOf(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
) {
  return error instanceof AuthError ? error.message : fallback;
}

/** The request never reached the server — offline, DNS, or a dropped connection. */
export function networkError() {
  return new AuthError(
    "We couldn't reach YADA. Check your connection and try again.",
    "NETWORK",
    null,
  );
}
