import { auth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

/**
 * Explicit Better Auth mount. Ensures /api/auth/* works even when
 * hooks.server.ts origin checks fail (e.g. localhost vs 127.0.0.1).
 */
const handleAuth: RequestHandler = async ({ request }) => {
	return auth.handler(request);
};

export const GET = handleAuth;
export const POST = handleAuth;
export const PUT = handleAuth;
export const PATCH = handleAuth;
export const DELETE = handleAuth;
export const OPTIONS = handleAuth;
