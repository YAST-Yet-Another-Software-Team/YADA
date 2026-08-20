import { getCourierHomeData } from '$lib/server/data/courier-trips';

export async function load({ parent }) {
	const { user } = await parent();

	return getCourierHomeData(user.id, user.name ?? 'Courier');
}
