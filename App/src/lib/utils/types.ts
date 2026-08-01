/**
 * Types shared by more than one module.
 *
 * The rule for living here is simply "more than one file needs it". Types used
 * by a single module stay in that module — component prop unions, request-body
 * shapes, local row projections — because moving them would only add an import
 * without removing a duplicate.
 *
 * Being a types-only module with no imports of its own, this is also the one
 * place both sides of the server/client boundary can reach. That matters: three
 * of the entries below existed twice precisely because a browser bundle must not
 * import `$lib/server`, so the client kept a hand-written copy of a server type.
 * A neutral module removes the need for the copy rather than the need to keep
 * the two in step.
 */

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * The two kinds of account YADA has: a business that requests deliveries, and a
 * courier that makes them. Anything else on a sign-up request is not a role.
 *
 * Was declared twice — `$auth/auth.server` and `$auth/session.svelte` — with
 * a comment on the second saying it mirrored the first.
 */
export type AuthRole = 'business' | 'courier';

/** The signed-in user, as both the server guards and the client session hold it. */
export type AuthUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: AuthRole;
  image: string | null;
};

/**
 * The same shape as `AuthUser`, under the name the server side uses for it
 * (`locals.user`, the route guards, the API guards).
 *
 * These were two structurally identical declarations either side of the
 * server/client split. Kept as an alias rather than collapsed to one name so
 * existing call sites read the same, and so the server keeps a word for "the
 * user this request resolved to" distinct from "the user the browser is
 * holding".
 */
export type SessionUser = AuthUser;

// ---------------------------------------------------------------------------
// Geography
// ---------------------------------------------------------------------------

/** A WGS84 coordinate pair. The most widely shared type in the app. */
export type LatLng = { lat: number; lng: number };

/** Why a geocode or routing call failed, in terms the UI can map to copy. */
export type GeoErrorCode =
  | 'quota'
  | 'denied'
  | 'no_results'
  | 'out_of_zone'
  | 'unavailable'
  | 'invalid_request';

/** A resolved address, as held in the forward/reverse geocode caches. */
export type CachedGeocode = {
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
};

/** One driving route, normalised out of the Google Routes response. */
export type DrivingRouteResult = {
  distanceMeters: number;
  durationSeconds: number;
  distanceText: string;
  durationText: string;
  path: LatLng[];
  distanceKm: number;
  durationMinutes: number;
};

// ---------------------------------------------------------------------------
// Trip lifecycle
// ---------------------------------------------------------------------------

/** The `trip_status` enum as stored in the database. */
export type TripStatus =
  | 'requested'
  | 'accepted'
  | 'courier_arriving'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

/** The six states the UI renders — see `StatusPill`. */
export type TripStage = 'searching' | 'assigned' | 'en_route' | 'arrived' | 'delivered' | 'cancelled';

/** A courier's live position, broadcast over the socket. */
export type RiderLocationEvent = {
  courierId?: string;
  tripId: string | null;
  lat: number;
  lng: number;
  heading?: number | null;
  recordedAt: string;
};

// ---------------------------------------------------------------------------
// Trip records
// ---------------------------------------------------------------------------

/** An open offer, as the courier app shows it before anyone has accepted. */
export type CourierRequest = {
  id: string;
  businessName: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat: number | null;
  pickupLng: number | null;
  dropoffLat: number | null;
  dropoffLng: number | null;
  notes: string | null;
  requestedAt: string;
};

/**
 * An accepted trip: the offer plus everything that only exists once a courier
 * is on it. Here rather than in `data/courier.ts` because `CourierRequest` is
 * its base and `$lib/server/courier-trip` consumes it.
 */
export type CourierTrip = CourierRequest & {
  status: TripStage;
  acceptedAt: string | null;
  completedAt: string | null;
  estimatedDistanceKm: number | null;
  estimatedDurationMinutes: number | null;
};

/**
 * A trip row as the business workspace renders it — dashboard, history, and the
 * two dashboard view components.
 *
 * Those four consumers are all browser code that previously reached into
 * `$lib/server/data/dashboard` for this type.
 */
export type DashboardTripRecord = {
  id: string;
  rawId: string;
  rider: string | null;
  destination: string;
  pickup: string | null;
  eta: string | null;
  status: TripStage;
  completedAt: string | null;
  notes: string | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  mapX?: number;
  mapY?: number;
};
