import { getCourierProfile } from '$lib/server/data/courier';

/** The plate prefill; name and phone come from the session the layout provides. */
export async function load({ parent }) {
	const { user } = await parent();

	return { courierProfile: await getCourierProfile(user.id) };
}
