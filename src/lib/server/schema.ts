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

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  fullName: text('full_name').notNull(),
  email: text('email').unique(),
  phoneNumber: text('phone_number').unique(),
  role: userRoleEnum('role').notNull().default('business'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

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