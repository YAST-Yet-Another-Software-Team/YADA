import { getBusinessAddress, getBusinessRating } from '$lib/server/data/business';

/**
 * The dispatch address, for the Location tab. Name, phone and email come from
 * the session the root layout already provides, so they are not re-fetched.
 *
 * The rating rides along because this is where the business looks itself up —
 * the other half of SRS 3.4 needs somewhere to land.
 */
export async function load({ parent }) {
	const { user } = await parent();

	const [business, rating] = await Promise.all([
		getBusinessAddress(user.id),
		getBusinessRating(user.id)
	]);

	return { business, rating };
}
