import { json } from '@sveltejs/kit';

import { seedTestBusinessUser } from '$lib/server/dashboard-data';

export async function POST() {
	const user = await seedTestBusinessUser();

	return json({
		ok: true,
		user
	});
}