import { error } from '@sveltejs/kit';

import { getCourierHomeData } from '$lib/server/courier-data';

export async function load({ locals }) {
	if (!locals.user?.id) {
		throw error(401, 'You need to be signed in.');
	}

	const courierName = locals.user.name ?? 'Courier';
	const data = await getCourierHomeData(locals.user.id, courierName);

	return {
		...data
	};
}
