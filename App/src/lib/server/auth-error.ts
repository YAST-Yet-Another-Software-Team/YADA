import { APIError } from 'better-auth/api';

import { authErrorMessage } from '$auth/errors';

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

  return authErrorMessage(body?.code ?? null, error.statusCode ?? null, fallback);
}
