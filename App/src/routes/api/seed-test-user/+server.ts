import { error, json } from '@sveltejs/kit';
import { dev } from '$app/environment';

import { seedTestBusinessUser } from '$lib/server/data/dashboard';

/**
 * Development-only fixture. It writes a user and business profile with no
 * credentials required, so it must never be reachable off a dev machine.
 */
export async function POST() {
	if (!dev) {
		error(404, 'Not found');
	}

	const user = await seedTestBusinessUser();

	return json({
		ok: true,
		user
	});
}
