import { getCourierHomeData } from '$lib/server/data/courier';

export async function load({ parent }) {
	const { user } = await parent();

	const courierName = user.name ?? 'Courier';
	const data = await getCourierHomeData(user.id, courierName);

	return {
		...data
	};
}
