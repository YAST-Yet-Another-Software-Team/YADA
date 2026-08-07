import { getCourierProfile } from '$lib/server/data/courier';

/**
 * The profile block at the top of Settings reads the courier's own row — the
 * plate lives there rather than on the account, so the session can't supply it.
 */
export async function load({ parent }) {
	const { user } = await parent();

	return { courierProfile: await getCourierProfile(user.id) };
}
