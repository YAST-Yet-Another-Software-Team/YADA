import { getBusinessAddress } from '$lib/server/data/business';

export async function load({ parent }) {
	const { user } = await parent();

	// The pickup half of a request is settled before the page renders: it is the
	// business's stored address, not something asked for per order. Setting it
	// lives on this page rather than in sign-up, because the map it gets pinned on
	// is already here — a business that hasn't set one is asked for it below.
	return { business: await getBusinessAddress(user.id) };
}
