import { getDashboardTrips } from '$lib/server/dashboard-data';

export async function load({ locals }) {
	const dashboard = await getDashboardTrips(locals.user?.id ?? undefined);

	return {
		dashboard
	};
}