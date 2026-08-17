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
  /**
   * Whether the address has been confirmed by clicking a link sent to it.
   *
   * Google accounts arrive with this already true — the provider vouches for
   * the address — so the nag banner and the two verification gates only ever
   * apply to email sign-ups.
   */
  emailVerified: boolean;
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

/**
 * The `trip_status` enum as stored in the database.
 *
 * Two phases with a handover between them: pickup runs `accepted` →
 * `courier_arriving` and ends when the business confirms (`picked_up`);
 * delivery runs `in_progress` → `completed` and starts when the courier says
 * so. `arrived` is legacy — see the schema.
 */
export type TripStatus =
  | 'requested'
  | 'accepted'
  | 'courier_arriving'
  | 'arrived'
  | 'picked_up'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

/** Which half of the journey a trip is in, for screens that speak in phases. */
export type TripPhase = 'pickup' | 'delivery';

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
  /** The counter to ring about this parcel — the sender, from their account. */
  businessPhone: string | null;
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
 * An offer as it rings on a courier's phone: the request, plus the three
 * numbers the decision is actually made on.
 *
 * All three are computed server-side. The distance is the one the dispatcher
 * ranked this courier by, so the rider sees the same figure that chose them,
 * and the countdown is the remainder of the 60-second dispatch window — sent as
 * a duration rather than a deadline so a skewed phone clock can't expire an
 * offer early or leave a dead one on screen.
 */
export type CourierOffer = CourierRequest & {
  distanceToPickupKm: number;
  tripDistanceKm: number | null;
  expiresInSeconds: number;
};

/**
 * The courier behind an accepted trip, as the business is shown them.
 *
 * One shape for every screen that names the rider — tracking, the dashboard
 * panel — so the two can't describe the same person differently. Sourced from
 * the user record and the courier profile, never from placeholder copy.
 */
export type CourierSummary = {
  id: string;
  name: string;
  initials: string;
  /** Their profile photo, as a data URL. SRS 3.3: the business sees it on acceptance. */
  image: string | null;
  phone: string | null;
  vehicleType: string | null;
  /** The plate on the bike, so a counter can match rider to trip. */
  plateNumber: string | null;
  rating: number | null;
  /** How many ratings stand behind the average. 4.9★ over 200 trips ≠ one 5★. */
  ratingCount: number;
};

/**
 * An accepted trip: the offer plus everything that only exists once a courier
 * is on it. Here rather than in `data/courier.ts` because `CourierRequest` is
 * its base and `$lib/server/courier-trip` consumes it.
 *
 * `status` is the stored status rather than a display stage: the courier's own
 * screens have to tell `picked_up` (waiting to set off) from `courier_arriving`
 * (waiting to be handed the parcel), and a stage collapses the two. Call
 * `toTripStage` where a pill or a label is what's wanted.
 */
export type CourierTrip = CourierRequest & {
  status: TripStatus;
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
  /**
   * How long the ride actually took, preformatted ("14 min"), or null until it
   * has been both accepted and completed. Replaces the map's ETA, which was a
   * forecast being displayed against finished trips. See `$lib/shared/ride-time`.
   */
  rideTime: string | null;
  status: TripStage;
  /**
   * When the current dispatch round started, ISO, or null if it never did.
   * Lets a `searching` row be told apart from one whose 60s window has closed —
   * the status alone stays `searching` either way. See `isDispatchExpired`.
   */
  dispatchStartedAt: string | null;
  completedAt: string | null;
  notes: string | null;
  /** What was sent, and what it was worth — the audit half of a delivery. */
  orderName: string;
  orderPrice: number;
  /** The stars this business gave, or null while the trip is unrated. */
  myRating?: number | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  mapX?: number;
  mapY?: number;
};
