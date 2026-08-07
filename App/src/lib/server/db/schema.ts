import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['business', 'courier']);

// A trip runs in two phases with an explicit handover between them: pickup
// (`accepted` → `courier_arriving` → the business confirming, which writes
// `picked_up`) and delivery (`in_progress` → `completed`). `arrived` predates
// the split and is kept only so historical rows still read.
export const tripStatusEnum = pgEnum('trip_status', [
  'requested',
  'accepted',
  'courier_arriving',
  'arrived',
  'picked_up',
  'in_progress',
  'completed',
  'cancelled'
]);

// ---------------------------------------------------------------------------
// Core user table — field names aligned with Better Auth conventions.
// Better Auth expects: id, name, email, emailVerified, image, createdAt, updatedAt.
// Extra YADA fields (phoneNumber, role) are carried as additionalFields.
// ---------------------------------------------------------------------------
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  phoneNumber: text('phone_number').unique(),
  role: userRoleEnum('role').notNull().default('business'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// ---------------------------------------------------------------------------
// Better Auth — sessions table
// ---------------------------------------------------------------------------
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// ---------------------------------------------------------------------------
// Better Auth — accounts table (for OAuth provider links, e.g. Google)
// ---------------------------------------------------------------------------
export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  idToken: text('id_token'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// ---------------------------------------------------------------------------
// Better Auth — verifications table (email/OTP verification tokens)
// ---------------------------------------------------------------------------
export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// ---------------------------------------------------------------------------
// Business profile — used by the business workspace to anchor the test business.
// ---------------------------------------------------------------------------
export const businessProfiles = pgTable('business_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  businessName: text('business_name').notNull(),
  address: text('address').notNull(),
  latitude: numeric('latitude', { precision: 10, scale: 6 }).notNull(),
  longitude: numeric('longitude', { precision: 10, scale: 6 }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// ---------------------------------------------------------------------------
// YADA domain tables
// ---------------------------------------------------------------------------
export const courierProfiles = pgTable('courier_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  vehicleType: text('vehicle_type').notNull(),
  // The plate on the bike that turns up. Every YADA courier rides a motorbike,
  // so the vehicle *type* tells a waiting business nothing; the plate is what
  // lets them match the rider at the counter to the trip on their screen.
  // Nullable: riders registered before this existed have none until they add it.
  plateNumber: text('plate_number'),
  // The rolling average of this courier's `trip_ratings`, cached here so every
  // screen that names a rider doesn't re-aggregate. `rating_count` rides along
  // because an average without its weight can't be smoothed — a lone 5.0 and
  // two hundred of them must not rank the same (see `data/matching`).
  rating: numeric('rating', { precision: 3, scale: 2 }).notNull().default('0.00'),
  ratingCount: integer('rating_count').notNull().default(0),
  active: boolean('active').notNull().default(true),
  currentLatitude: numeric('current_latitude', { precision: 10, scale: 6 }),
  currentLongitude: numeric('current_longitude', { precision: 10, scale: 6 }),
  lastLocationAt: timestamp('last_location_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const deliveryRequests = pgTable('delivery_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: text('business_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  assignedCourierId: text('assigned_courier_id').references(() => users.id, {
    onDelete: 'set null'
  }),
  status: tripStatusEnum('status').notNull().default('requested'),
  pickupAddress: text('pickup_address').notNull(),
  dropoffAddress: text('dropoff_address').notNull(),
  pickupLatitude: numeric('pickup_latitude', { precision: 10, scale: 6 }),
  pickupLongitude: numeric('pickup_longitude', { precision: 10, scale: 6 }),
  dropoffLatitude: numeric('dropoff_latitude', { precision: 10, scale: 6 }),
  dropoffLongitude: numeric('dropoff_longitude', { precision: 10, scale: 6 }),
  pickupPlaceId: text('pickup_place_id'),
  dropoffPlaceId: text('dropoff_place_id'),
  // What is actually being sent, and what it is worth. Captured before the
  // request can be raised — a delivery record that cannot say what was in the
  // parcel is not an audit record. Both are NOT NULL for that reason: there is
  // no such thing as a YADA delivery of nothing.
  //
  // The price is the *order's* value in cedis, not a delivery fee: YADA does
  // not price the ride. It is here so a disputed handover has a number attached
  // to it, and it is deliberately never sent to the courier app.
  orderName: text('order_name').notNull(),
  orderPrice: numeric('order_price', { precision: 10, scale: 2 }).notNull(),
  notes: text('notes'),
  estimatedDistanceKm: numeric('estimated_distance_km', { precision: 8, scale: 2 }),
  estimatedDurationMinutes: numeric('estimated_duration_minutes', { precision: 8, scale: 2 }),
  // The dispatch clock (see `$lib/shared/dispatch`). Set at creation, reset by
  // a manual re-ring; the current ring is always computed from it, never
  // stored. Distinct from `requested_at`, which stays as history.
  dispatchStartedAt: timestamp('dispatch_started_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true })
});

/**
 * One party's verdict on the other, per trip.
 *
 * Direction-agnostic (`rater` → `rated`) even though only the business→courier
 * flow exists today: SRS 3.4 has both parties rating each other, and the
 * courier→business half will be the same row with the columns swapped. The
 * unique constraint is what makes "rate this trip" idempotent-hostile — a
 * second submission is a conflict, not a louder first one.
 */
export const tripRatings = pgTable(
  'trip_ratings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => deliveryRequests.id, { onDelete: 'cascade' }),
    raterId: text('rater_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ratedId: text('rated_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** 1–5, whole stars. Range-checked in the migration and again by the API. */
    stars: integer('stars').notNull(),
    comment: text('comment'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [unique('trip_ratings_once_per_rater').on(table.tripId, table.raterId)]
);

/**
 * "No" is an answer with a memory: a courier who declines a request is not
 * ringed for it again, including after the business manually re-rings it. Rows
 * are per request, not per courier pair — declining one delivery says nothing
 * about the next one.
 */
export const tripDeclines = pgTable(
  'trip_declines',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => deliveryRequests.id, { onDelete: 'cascade' }),
    courierId: text('courier_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [unique('trip_declines_once').on(table.tripId, table.courierId)]
);

export const tripEvents = pgTable('trip_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  tripId: uuid('trip_id')
    .notNull()
    .references(() => deliveryRequests.id, { onDelete: 'cascade' }),
  actorId: text('actor_id').references(() => users.id, { onDelete: 'set null' }),
  eventType: text('event_type').notNull(),
  payload: text('payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});