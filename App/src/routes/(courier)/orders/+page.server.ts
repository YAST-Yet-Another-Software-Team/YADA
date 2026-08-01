import { getCourierOrdersData } from '$lib/server/data/courier';

export async function load({ parent }) {
	const { user } = await parent();

	return getCourierOrdersData(user.id);
}
