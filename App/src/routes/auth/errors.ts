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
