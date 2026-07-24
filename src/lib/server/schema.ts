import { boolean, numeric, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['business', 'courier', 'admin']);

export const tripStatusEnum = pgEnum('trip_status', [
  'requested',
  'accepted',
  'courier_arriving',
  'arrived',
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
// YADA domain tables
// ---------------------------------------------------------------------------
export const courierProfiles = pgTable('courier_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  vehicleType: text('vehicle_type').notNull(),
  rating: numeric('rating', { precision: 3, scale: 2 }).notNull().default('0.00'),
  active: boolean('active').notNull().default(true),
  currentLatitude: numeric('current_latitude', { precision: 10, scale: 6 }),
  currentLongitude: numeric('current_longitude', { precision: 10, scale: 6 }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const deliveryRequests = pgTable('delivery_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  assignedCourierId: uuid('assigned_courier_id').references(() => users.id, {
    onDelete: 'set null'
  }),
  status: tripStatusEnum('status').notNull().default('requested'),
  pickupAddress: text('pickup_address').notNull(),
  dropoffAddress: text('dropoff_address').notNull(),
  notes: text('notes'),
  estimatedDistanceKm: numeric('estimated_distance_km', { precision: 8, scale: 2 }),
  estimatedDurationMinutes: numeric('estimated_duration_minutes', { precision: 8, scale: 2 }),
  requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true })
});

export const tripEvents = pgTable('trip_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  tripId: uuid('trip_id')
    .notNull()
    .references(() => deliveryRequests.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
  eventType: text('event_type').notNull(),
  payload: text('payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});