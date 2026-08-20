import { getCourierOrdersData } from '$lib/server/data/courier-trips';

export async function load({ parent }) {
	const { user } = await parent();

	return getCourierOrdersData(user.id);
}
