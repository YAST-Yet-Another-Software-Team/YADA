import { getCourierHomeData } from '$lib/server/data/courier';

export async function load({ parent }) {
	const { user } = await parent();

	return getCourierHomeData(user.id, user.name ?? 'Courier');
}
