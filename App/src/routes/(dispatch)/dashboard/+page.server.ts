import { getDashboardTrips } from '$lib/server/data/dashboard';

export async function load({ locals }) {
	const dashboard = await getDashboardTrips(locals.user?.id ?? undefined);

	return {
		dashboard
	};
}