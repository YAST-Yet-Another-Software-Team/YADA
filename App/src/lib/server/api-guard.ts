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
