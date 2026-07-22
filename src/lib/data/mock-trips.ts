export type TripStatus = 'searching' | 'assigned' | 'en_route' | 'arrived' | 'delivered' | 'cancelled';

export type MockTrip = {
	id: string;
	rider: string | null;
	destination: string;
	eta: string | null;
	status: TripStatus;
	completedAt?: string;
};

export const dashboardStats = {
	activeDeliveries: 3,
	avgPickupTime: '6 min',
	deliveredToday: 28
};

export const activeTrips: MockTrip[] = [
	{
		id: 'YD-4521',
		rider: 'Kwame A.',
		destination: '88 Elm St',
		eta: '4 min',
		status: 'en_route'
	},
	{
		id: 'YD-4520',
		rider: 'Ama O.',
		destination: '14 Pine Ct',
		eta: '9 min',
		status: 'assigned'
	},
	{
		id: 'YD-4519',
		rider: null,
		destination: '300 Oak Ave',
		eta: null,
		status: 'searching'
	}
];

export const historyTrips: MockTrip[] = [
	{
		id: 'YD-4521',
		rider: 'Kwame A.',
		destination: '88 Elm St',
		eta: null,
		status: 'delivered',
		completedAt: 'Today · 2:41 PM'
	},
	{
		id: 'YD-4498',
		rider: 'Ama O.',
		destination: '12 River Rd',
		eta: null,
		status: 'delivered',
		completedAt: 'Today · 1:05 PM'
	},
	{
		id: 'YD-4477',
		rider: null,
		destination: '300 Oak Ave',
		eta: null,
		status: 'cancelled',
		completedAt: 'Yesterday · 6:22 PM'
	},
	{
		id: 'YD-4460',
		rider: 'Kojo B.',
		destination: '9 Pine Ct',
		eta: null,
		status: 'delivered',
		completedAt: 'Yesterday · 12:10 PM'
	}
];

export const boardColumns: Array<{ key: TripStatus | 'delivered'; title: string }> = [
	{ key: 'searching', title: 'Finding rider' },
	{ key: 'assigned', title: 'Assigned' },
	{ key: 'en_route', title: 'En route' },
	{ key: 'delivered', title: 'Delivered today' }
];
