export type TripStatus = 'searching' | 'assigned' | 'en_route' | 'arrived' | 'delivered' | 'cancelled';

export type MockTrip = {
	id: string;
	rider: string | null;
	destination: string;
	pickup?: string;
	eta: string | null;
	status: TripStatus;
	completedAt?: string;
	notes?: string;
	/** Percent positions on the placeholder map (0–100) */
	mapX?: number;
	mapY?: number;
};

export type MockRider = {
	id: string;
	name: string;
	vehicle: string;
	distanceKm: number;
	mapX: number;
	mapY: number;
};

export const businessProfile = {
	name: 'Jordan Mensah',
	businessName: 'Favorie Kitchen',
	email: 'jordan@favorie.com',
	phone: '+233 24 555 0142',
	address: '221 Baker St — Kitchen',
	mapX: 48,
	mapY: 52
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
		pickup: '221 Baker St — Kitchen',
		eta: '4 min',
		status: 'en_route',
		notes: 'Leave at front desk if closed.',
		mapX: 28,
		mapY: 40
	},
	{
		id: 'YD-4520',
		rider: 'Ama O.',
		destination: '14 Pine Ct',
		pickup: '221 Baker St — Kitchen',
		eta: '9 min',
		status: 'assigned',
		notes: 'Call on arrival.',
		mapX: 62,
		mapY: 58
	},
	{
		id: 'YD-4519',
		rider: null,
		destination: '300 Oak Ave',
		pickup: '221 Baker St — Kitchen',
		eta: null,
		status: 'searching',
		notes: 'Finding a nearby motor rider.',
		mapX: 50,
		mapY: 48
	}
];

export const historyTrips: MockTrip[] = [
	{
		id: 'YD-4521',
		rider: 'Kwame A.',
		destination: '88 Elm St',
		pickup: '221 Baker St — Kitchen',
		eta: null,
		status: 'delivered',
		completedAt: 'Today · 2:41 PM',
		notes: 'Delivered to customer.'
	},
	{
		id: 'YD-4498',
		rider: 'Ama O.',
		destination: '12 River Rd',
		pickup: '221 Baker St — Kitchen',
		eta: null,
		status: 'delivered',
		completedAt: 'Today · 1:05 PM',
		notes: 'Handed to receptionist.'
	},
	{
		id: 'YD-4477',
		rider: null,
		destination: '300 Oak Ave',
		pickup: '221 Baker St — Kitchen',
		eta: null,
		status: 'cancelled',
		completedAt: 'Yesterday · 6:22 PM',
		notes: 'No riders available nearby.'
	},
	{
		id: 'YD-4460',
		rider: 'Kojo B.',
		destination: '9 Pine Ct',
		pickup: '221 Baker St — Kitchen',
		eta: null,
		status: 'delivered',
		completedAt: 'Yesterday · 12:10 PM',
		notes: 'Left with security.'
	}
];

export const availableRiders: MockRider[] = [
	{ id: 'r1', name: 'Kwame A.', vehicle: 'Yamaha', distanceKm: 0.4, mapX: 32, mapY: 36 },
	{ id: 'r2', name: 'Ama O.', vehicle: 'Honda', distanceKm: 0.9, mapX: 58, mapY: 44 },
	{ id: 'r3', name: 'Kojo B.', vehicle: 'TVS', distanceKm: 1.3, mapX: 70, mapY: 62 },
	{ id: 'r4', name: 'Efua S.', vehicle: 'Bajaj', distanceKm: 1.8, mapX: 22, mapY: 68 },
	{ id: 'r5', name: 'Yaw T.', vehicle: 'Yamaha', distanceKm: 2.4, mapX: 78, mapY: 28 }
];

export const boardColumns: Array<{ key: TripStatus | 'delivered'; title: string }> = [
	{ key: 'searching', title: 'Finding rider' },
	{ key: 'assigned', title: 'Assigned' },
	{ key: 'en_route', title: 'En route' },
	{ key: 'delivered', title: 'Delivered today' }
];
