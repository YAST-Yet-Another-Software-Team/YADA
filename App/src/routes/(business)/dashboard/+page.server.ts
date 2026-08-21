import { getDashboardTrips } from "$lib/server/data/dashboard";

export async function load({ parent }) {
  const { user } = await parent();
  const dashboard = await getDashboardTrips(user.id);

  return {
    dashboard,
  };
}
