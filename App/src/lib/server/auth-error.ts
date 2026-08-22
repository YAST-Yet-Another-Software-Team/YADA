import { APIError } from "better-auth/api";

import { authErrorMessage, signInErrorMessage } from "$auth/errors";

/**
 * Turn a thrown Better Auth error into copy, or `null` if it isn't one.
 *
 * `null` means "not ours" and the caller must rethrow: SvelteKit's `redirect`
 * works by throwing, so a catch that swallowed everything would turn every
 * redirect into a silent failure.
 *
 * Lives under $lib/server rather than beside `authErrorMessage` in
 * $auth/errors because it imports `better-auth/api`, and that module is also
 * imported by the client session store.
 */
export function messageForApiError(error: unknown, fallback: string) {
  if (!(error instanceof APIError)) return null;

  const body = error.body as { code?: string } | undefined;

  return authErrorMessage(
    body?.code ?? null,
    error.statusCode ?? null,
    fallback,
  );
}

/**
 * The same, for the sign-in form, where every refusal has to read alike.
 *
 * A separate function rather than a flag on the one above so the choice is
 * visible at the call site: a reader of the `signin` action can see that it
 * answers differently from `signup` beside it, and why.
 */
export function messageForSignInError(error: unknown, fallback: string) {
  if (!(error instanceof APIError)) return null;

  const body = error.body as { code?: string } | undefined;

  return signInErrorMessage(
    body?.code ?? null,
    error.statusCode ?? null,
    fallback,
  );
}
