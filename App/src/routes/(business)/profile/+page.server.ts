import { getBusinessAddress } from '$lib/server/data/business';

/**
 * The dispatch address, for the Location tab. Name, phone and email come from
 * the session the root layout already provides, so they are not re-fetched.
 */
export async function load({ parent }) {
	const { user } = await parent();

	return { business: await getBusinessAddress(user.id) };
}
