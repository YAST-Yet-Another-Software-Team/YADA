import { getAvailableRiders, getDashboardTrips } from '$lib/server/data/dashboard';

export async function load({ parent }) {
	const { user } = await parent();
	const [dashboard, availableRiders] = await Promise.all([
		getDashboardTrips(user.id),
		getAvailableRiders(user.id)
	]);

	return {
		businessProfile: dashboard.businessProfile,
		availableRiders
	};
}
