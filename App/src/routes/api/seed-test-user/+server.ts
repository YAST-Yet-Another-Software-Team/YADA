import { json } from '@sveltejs/kit';

import { seedTestBusinessUser } from '$lib/server/data/dashboard';

export async function POST() {
	const user = await seedTestBusinessUser();

	return json({
		ok: true,
		user
	});
}