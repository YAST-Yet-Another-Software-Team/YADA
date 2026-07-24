import { getAvailableRiders, getDashboardTrips } from '$lib/server/dashboard-data';

export async function load({ locals }) {
	const userId = locals.user?.id ?? undefined;
	const [dashboard, availableRiders] = await Promise.all([
		getDashboardTrips(userId),
		getAvailableRiders(userId)
	]);

	return {
		businessProfile: dashboard.businessProfile,
		availableRiders
	};
}