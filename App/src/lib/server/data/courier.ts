import { and, desc, eq, inArray, isNull } from 'drizzle-orm';

import { DISPATCH_TIMEOUT_SECONDS } from '$lib/shared/dispatch';
import { haversineKm } from '$lib/shared/geo/service-area';
import { ACTIVE_TRIP_STATUSES, CLOSED_TRIP_STATUSES } from '$lib/shared/trip-status';
import { initials } from '$lib/shared/text';
import type { CourierOffer, CourierRequest, CourierTrip, LatLng } from '$lib/utils/types';

import { db } from '../db';
import {
  businessProfiles,
  courierProfiles,
  deliveryRequests,
  tripDeclines,
  users
} from '../db/schema';
import { courierMatchScore, MATCH_LOCATION_FRESH_MS, offerWindow } from './matching';
import { ratingByRaterForTrip, ratingsByRaterFor } from './ratings';

export type CourierHomeSummary = {
  completedTrips: number;
  tripsToday: number;
  totalDistanceKm: number;
  activeTrips: number;
};

// ---------------------------------------------------------------------------
// Query building
// ---------------------------------------------------------------------------

/**
 * Every courier-facing trip query reads the same columns and joins the same
 * business name, so the projection lives here once rather than being spelled
 * out at each call site.
 */
const tripColumns = {
  id: deliveryRequests.id,
  status: deliveryRequests.status,
  pickupAddress: deliveryRequests.pickupAddress,
  dropoffAddress: deliveryRequests.dropoffAddress,
  pickupLatitude: deliveryRequests.pickupLatitude,
  pickupLongitude: deliveryRequests.pickupLongitude,
  dropoffLatitude: deliveryRequests.dropoffLatitude,
  dropoffLongitude: deliveryRequests.dropoffLongitude,
  estimatedDistanceKm: deliveryRequests.estimatedDistanceKm,
  estimatedDurationMinutes: deliveryRequests.estimatedDurationMinutes,
  dispatchStartedAt: deliveryRequests.dispatchStartedAt,
  requestedAt: deliveryRequests.requestedAt,
  acceptedAt: deliveryRequests.acceptedAt,
  completedAt: deliveryRequests.completedAt,
  notes: deliveryRequests.notes,
  businessName: users.name,
  businessPhone: users.phoneNumber,
  businessRating: businessProfiles.rating,
  businessRatingCount: businessProfiles.ratingCount
};

function tripQuery() {
  return (
    db
      .select(tripColumns)
      .from(deliveryRequests)
      .innerJoin(users, eq(deliveryRequests.businessId, users.id))
      // Left, not inner: the profile is created when a business sets its
      // dispatch address, and a trip must not vanish from a rider's screen
      // because the sender hasn't finished onboarding. Both rating columns come
      // back null in that case, which reads as unrated.
      .leftJoin(businessProfiles, eq(businessProfiles.userId, deliveryRequests.businessId))
  );
}

type TripRow = Awaited<ReturnType<ReturnType<typeof tripQuery>['execute']>>[number];

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

/** `numeric` columns come back from the driver as strings. */
function asNumber(value: string | number | null | undefined) {
  if (value == null) return null;
  return typeof value === 'number' ? value : Number(value);
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function toCourierRequest(row: TripRow): CourierRequest {
  return {
    id: row.id,
    businessName: row.businessName,
    businessPhone: row.businessPhone,
    pickupAddress: row.pickupAddress,
    dropoffAddress: row.dropoffAddress,
    pickupLat: asNumber(row.pickupLatitude),
    pickupLng: asNumber(row.pickupLongitude),
    dropoffLat: asNumber(row.dropoffLatitude),
    dropoffLng: asNumber(row.dropoffLongitude),
    notes: row.notes,
    requestedAt: row.requestedAt.toISOString(),
    businessRating: {
      // Null unless somebody has actually rated them: the cached column
      // defaults to 0.00, and showing that as a score would brand every new
      // business a zero.
      average: row.businessRatingCount ? Number(row.businessRating) : null,
      count: row.businessRatingCount ?? 0
    }
  };
}

/**
 * `myRating` defaults to null because most callers are looking at a trip that
 * is still running, where the rider's verdict cannot exist yet. Only the two
 * completed-trip queries below pay for the extra read.
 */
function toCourierTrip(row: TripRow, myRating: number | null = null): CourierTrip {
  return {
    ...toCourierRequest(row),
    // The stored status, not a display stage: the pickup screen has to tell
    // "waiting to be handed the parcel" from "cleared to set off".
    status: row.status,
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    estimatedDistanceKm: asNumber(row.estimatedDistanceKm),
    estimatedDurationMinutes: asNumber(row.estimatedDurationMinutes),
    myRating
  };
}

function startOfToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start.getTime();
}

/** Delivery counts and distance covered, derived from the delivered trips in a set. */
function summarize(trips: CourierTrip[], activeTrips: number): CourierHomeSummary {
  const delivered = trips.filter((trip) => trip.status === 'completed');
  const today = startOfToday();

  return {
    completedTrips: delivered.length,
    tripsToday: delivered.filter(
      (trip) => trip.completedAt && new Date(trip.completedAt).getTime() >= today
    ).length,
    totalDistanceKm: round(
      delivered.reduce((sum, trip) => sum + (trip.estimatedDistanceKm ?? 0), 0),
      1
    ),
    activeTrips
  };
}

export function courierProfileOf(name: string | null | undefined, fallback = 'Courier') {
  const displayName = name || fallback;
  return { name: displayName, initials: initials(displayName, 'C') };
}

/**
 * The courier's own standing: the cached average and how many verdicts stand
 * behind it. A rating drives behaviour only if the rider actually sees it, so
 * their screens read the same cache the matching rubric ranks by.
 */
export async function getCourierRating(userId: string) {
  const [row] = await db
    .select({ rating: courierProfiles.rating, ratingCount: courierProfiles.ratingCount })
    .from(courierProfiles)
    .where(eq(courierProfiles.userId, userId))
    .limit(1);

  return {
    average: row && row.ratingCount > 0 ? Number(row.rating) : null,
    count: row?.ratingCount ?? 0
  };
}

/**
 * What every courier rides.
 *
 * YADA is a motor courier service — the SRS calls it that in its first line —
 * so the vehicle is a property of the product, not a question for the sign-up
 * form. The column stays because the schema has it and the business-facing
 * screens read it; it simply isn't asked for.
 */
export const COURIER_VEHICLE_TYPE = 'Motorbike';

/**
 * Create the courier's profile row, at sign-up.
 *
 * Nothing created one before: only the dev seed did, so a courier who actually
 * registered had a user record and no profile. `POST /api/location` writes the
 * live position into this table, and an update against a row that isn't there
 * changes nothing — their position was silently dropped on every fix, which is
 * also why the business map and the proximity checks had nothing to read.
 *
 * An upsert because `user_id` is not unique on this table, so a retried sign-up
 * would otherwise leave two rows and make "the courier's profile" ambiguous.
 */
export async function saveCourierProfile(
  userId: string,
  input: { vehicleType?: string; plateNumber?: string | null } = {}
) {
  const vehicleType = input.vehicleType ?? COURIER_VEHICLE_TYPE;
  // Absent means "leave it alone" — sign-up doesn't ask for a plate, and the
  // settings form that does must not be able to wipe it by omission.
  const plate = input.plateNumber === undefined ? undefined : normalisePlate(input.plateNumber);

  const [existing] = await db
    .select({ id: courierProfiles.id })
    .from(courierProfiles)
    .where(eq(courierProfiles.userId, userId))
    .limit(1);

  if (existing) {
    await db
      .update(courierProfiles)
      .set({
        vehicleType,
        ...(plate === undefined ? {} : { plateNumber: plate }),
        updatedAt: new Date()
      })
      .where(eq(courierProfiles.id, existing.id));
    return;
  }

  await db.insert(courierProfiles).values({
    userId,
    vehicleType,
    plateNumber: plate ?? null
  });
}

/**
 * Clock a courier on or off.
 *
 * Two callers: the availability toggle on Home, and signing out — which is
 * clocking off whether or not the rider thought of it that way. Dispatch reads
 * this flag before it reads a position, so it is what stops the ringing.
 */
export async function setCourierAvailability(userId: string, online: boolean) {
  await db
    .update(courierProfiles)
    .set({ active: online, updatedAt: new Date() })
    .where(eq(courierProfiles.userId, userId));
}

/**
 * A plate as it should be stored: upper case, single-spaced, or null when the
 * rider clears the field. Ghanaian plates read `GT 4521-20`, and riders type
 * them however they like.
 */
export function normalisePlate(value: string | null | undefined) {
  const trimmed = value?.trim().replace(/\s+/g, ' ').toUpperCase() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

/** The courier's own profile, for the screens that let them edit it. */
export async function getCourierProfile(userId: string) {
  const [row] = await db
    .select({
      vehicleType: courierProfiles.vehicleType,
      plateNumber: courierProfiles.plateNumber
    })
    .from(courierProfiles)
    .where(eq(courierProfiles.userId, userId))
    .limit(1);

  return {
    vehicleType: row?.vehicleType ?? COURIER_VEHICLE_TYPE,
    plateNumber: row?.plateNumber ?? null
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

const byMostRecentlyAccepted = [
  desc(deliveryRequests.acceptedAt),
  desc(deliveryRequests.requestedAt)
] as const;

const byMostRecentlyCompleted = [
  desc(deliveryRequests.completedAt),
  desc(deliveryRequests.requestedAt)
] as const;

/** The trip this courier is currently on the hook for. */
const activeTripsFor = (userId: string) =>
  and(
    eq(deliveryRequests.assignedCourierId, userId),
    inArray(deliveryRequests.status, [...ACTIVE_TRIP_STATUSES])
  );

/** Everything this courier has finished, delivered or cancelled. */
const closedTripsFor = (userId: string) =>
  and(
    eq(deliveryRequests.assignedCourierId, userId),
    inArray(deliveryRequests.status, [...CLOSED_TRIP_STATUSES])
  );

/** Offers on the board: requested, nobody assigned yet. Not courier-scoped. */
const openRequests = () =>
  and(eq(deliveryRequests.status, 'requested'), isNull(deliveryRequests.assignedCourierId));

/**
 * The requests currently ringing *this* courier. This is the dispatcher.
 *
 * Every open request carries its dispatch clock, and each courier's board asks
 * the same three questions of each one:
 *
 *   1. Am I excluded? Declined requests never come back, offline couriers hear
 *      nothing, and without a fresh position there is no distance to ring by —
 *      the unlocatable can't be "nearest".
 *   2. Has my ring opened? `offerWindow` gives the second this courier's alert
 *      starts — ring by distance, staggered by rating, delayed if busy — and
 *      the request's elapsed time either has or hasn't reached it.
 *   3. Has the whole search expired? Past the 60 s timeout nobody is ringed,
 *      and only the business can restart the clock.
 *
 * Priority is emergent rather than orchestrated: nearer couriers' windows open
 * earlier, idle beats busy, higher-rated beats lower-rated within a ring — all
 * of it falls out of the window arithmetic, evaluated on every poll, with no
 * scheduler to crash or drift.
 *
 * A busy courier's ringing position is where their current trip *ends*: they
 * qualify only when that drop-off is inside the first ring of the new pickup.
 */
async function ringingRequestRows(userId: string, activeTripRow: TripRow | null) {
  const [profile] = await db
    .select({
      lat: courierProfiles.currentLatitude,
      lng: courierProfiles.currentLongitude,
      locatedAt: courierProfiles.lastLocationAt,
      rating: courierProfiles.rating,
      ratingCount: courierProfiles.ratingCount,
      active: courierProfiles.active
    })
    .from(courierProfiles)
    .where(eq(courierProfiles.userId, userId))
    .limit(1);

  if (!profile?.active) return [];

  const busy = activeTripRow != null;
  let origin: LatLng | null = null;

  if (busy) {
    if (activeTripRow.dropoffLatitude != null && activeTripRow.dropoffLongitude != null) {
      origin = {
        lat: Number(activeTripRow.dropoffLatitude),
        lng: Number(activeTripRow.dropoffLongitude)
      };
    }
  } else if (
    profile.lat != null &&
    profile.lng != null &&
    profile.locatedAt != null &&
    Date.now() - profile.locatedAt.getTime() <= MATCH_LOCATION_FRESH_MS
  ) {
    origin = { lat: Number(profile.lat), lng: Number(profile.lng) };
  }

  if (!origin) return [];

  const declinedRows = await db
    .select({ tripId: tripDeclines.tripId })
    .from(tripDeclines)
    .where(eq(tripDeclines.courierId, userId));
  const declined = new Set(declinedRows.map((row) => row.tripId));

  const open = await tripQuery().where(openRequests()).orderBy(desc(deliveryRequests.requestedAt));

  const now = Date.now();
  const rating = Number(profile.rating);
  const ratingCount = profile.ratingCount;

  return open
    .filter((row) => !declined.has(row.id) && row.pickupLatitude != null)
    .map((row) => {
      const distanceKm = haversineKm(origin, {
        lat: Number(row.pickupLatitude),
        lng: Number(row.pickupLongitude)
      });

      const opensAt = offerWindow({ distanceKm, busy, rating, ratingCount });
      if (opensAt == null) return null;

      const elapsedSeconds = (now - row.dispatchStartedAt.getTime()) / 1000;
      if (elapsedSeconds < opensAt || elapsedSeconds > DISPATCH_TIMEOUT_SECONDS) return null;

      return {
        row,
        score: courierMatchScore({ distanceKm, rating, ratingCount }),
        // Carried out with the row rather than recomputed on the client: this is
        // the distance the dispatcher ranked this courier by, and the client has
        // no way to know it — a busy rider is ringed from where their current
        // trip *ends*, not from where they are.
        distanceToPickupKm: round(distanceKm, 1),
        expiresInSeconds: Math.max(0, Math.round(DISPATCH_TIMEOUT_SECONDS - elapsedSeconds))
      };
    })
    .filter((candidate) => candidate != null)
    .sort((a, b) => b.score - a.score);
}

/** An offer as its screen needs it: the request plus what the ring decided. */
function toCourierOffer(candidate: {
  row: TripRow;
  distanceToPickupKm: number;
  expiresInSeconds: number;
}): CourierOffer {
  return {
    ...toCourierRequest(candidate.row),
    distanceToPickupKm: candidate.distanceToPickupKm,
    tripDistanceKm: asNumber(candidate.row.estimatedDistanceKm),
    expiresInSeconds: candidate.expiresInSeconds
  };
}

export async function getCourierHomeData(userId: string, courierName: string) {
  const [profileRow] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // The active trip first: whether this courier is busy changes which requests
  // ring them at all.
  const [activeRows, closedRows] = await Promise.all([
    tripQuery().where(activeTripsFor(userId)).orderBy(...byMostRecentlyAccepted).limit(1),
    tripQuery().where(closedTripsFor(userId)).orderBy(...byMostRecentlyCompleted)
  ]);

  const activeTripRow = activeRows[0] ?? null;
  const pendingRows = await ringingRequestRows(userId, activeTripRow);

  return {
    profile: courierProfileOf(profileRow?.name ?? courierName),
    activeTrip: activeTripRow ? toCourierTrip(activeTripRow) : null,
    pendingRequests: pendingRows.map(toCourierOffer),
    summary: summarize(closedRows.map(toCourierTrip), activeTripRow ? 1 : 0)
  };
}

/**
 * The Orders tab: what this courier is carrying right now, plus the offers
 * currently ringing them. Deliberately narrower than `getCourierHomeData` — no
 * profile and no lifetime summary, neither of which the screen renders.
 */
export async function getCourierOrdersData(userId: string) {
  const activeRows = await tripQuery()
    .where(activeTripsFor(userId))
    .orderBy(...byMostRecentlyAccepted)
    .limit(1);

  const activeTripRow = activeRows[0] ?? null;
  const pendingRows = await ringingRequestRows(userId, activeTripRow);

  return {
    activeTrip: activeTripRow ? toCourierTrip(activeTripRow) : null,
    pendingRequests: pendingRows.map(toCourierOffer)
  };
}

/**
 * The courier's trip for the pickup/deliver screens: a specific one when an id
 * is given, otherwise whichever is currently live.
 */
export async function getCourierTripById(userId: string, tripId?: string | null) {
  const [row] = await tripQuery()
    .where(
      tripId
        ? and(eq(deliveryRequests.assignedCourierId, userId), eq(deliveryRequests.id, tripId))
        : activeTripsFor(userId)
    )
    .orderBy(...byMostRecentlyAccepted)
    .limit(1);

  return row ? toCourierTrip(row) : null;
}

export async function getCourierLatestCompletedTrip(userId: string, tripId?: string | null) {
  const [row] = await tripQuery()
    .where(
      tripId
        ? and(eq(deliveryRequests.assignedCourierId, userId), eq(deliveryRequests.id, tripId))
        : closedTripsFor(userId)
    )
    .orderBy(...byMostRecentlyCompleted)
    .limit(1);

  if (!row) return null;

  // The completion screen offers the business its stars, so it has to know
  // whether this rider already gave them — otherwise a reload after rating
  // hands them a fresh form that the API will then reject as a duplicate.
  return toCourierTrip(row, await ratingByRaterForTrip(userId, row.id));
}

export async function getCourierTripHistory(userId: string) {
  const rows = await tripQuery()
    .where(closedTripsFor(userId))
    .orderBy(...byMostRecentlyCompleted);

  // One read for the whole page rather than one per card.
  const myRatings = await ratingsByRaterFor(
    userId,
    rows.map((row) => row.id)
  );

  const historyTrips = rows.map((row) => toCourierTrip(row, myRatings.get(row.id) ?? null));

  return {
    historyTrips,
    summary: summarize(historyTrips, 0)
  };
}
