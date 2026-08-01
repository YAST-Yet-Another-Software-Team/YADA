import { getBusinessAddress } from '$lib/server/data/business';

export async function load({ parent }) {
	const { user } = await parent();

	// The pickup half of a request is settled before the page renders: it is the
	// address the business gave at sign-up, not something asked for per order.
	return { business: await getBusinessAddress(user.id) };
}
