import { eq } from 'drizzle-orm';

import { initials } from '$lib/shared/text';
import type { CourierSummary, LatLng } from '$lib/utils/types';

import { db } from '../db';
import { toCoordinateColumn } from '../db/columns';
import { businessProfiles, courierProfiles, users } from '../db/schema';

/**
 * The business's fixed dispatch address.
 *
 * Every delivery leaves from here, so the origin of a trip is read from this row
 * on the server rather than sent up with each request — a stationary business
 * that could nominate a different pickup per order isn't stationary.
 */
export type BusinessAddress = {
  businessName: string;
  address: string;
  lat: number;
  lng: number;
};

export async function getBusinessAddress(userId: string): Promise<BusinessAddress | null> {
  const [row] = await db
    .select()
    .from(businessProfiles)
    .where(eq(businessProfiles.userId, userId))
    .limit(1);

  if (!row) return null;

  return {
    businessName: row.businessName,
    address: row.address,
    lat: Number(row.latitude),
    lng: Number(row.longitude)
  };
}

/**
 * What riders make of this business, from the cache `rateForTrip` maintains.
 *
 * Mirrors `getCourierRating`, including the null-when-unrated rule: the column
 * defaults to `0.00`, and a business nobody has rated must not be shown as a
 * zero-star business. Its own score is the only reason the rider→business
 * direction is worth collecting — a rating nobody can see changes nothing.
 */
export async function getBusinessRating(userId: string) {
  const [row] = await db
    .select({ rating: businessProfiles.rating, ratingCount: businessProfiles.ratingCount })
    .from(businessProfiles)
    .where(eq(businessProfiles.userId, userId))
    .limit(1);

  return {
    average: row && row.ratingCount > 0 ? Number(row.rating) : null,
    count: row?.ratingCount ?? 0
  };
}

/**
 * The courier on a trip, as the business is shown them.
 *
 * One lookup behind every business-facing mention of a rider, so the tracking
 * screen and the dashboard can't disagree about who is carrying the parcel.
 * A courier with no profile row still returns a summary — the name and phone
 * come from the account, and vehicle and rating are simply unknown.
 */
export async function getCourierSummary(courierId: string): Promise<CourierSummary | null> {
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      image: users.image,
      deletedAt: users.deletedAt,
      phone: users.phoneNumber,
      vehicleType: courierProfiles.vehicleType,
      plateNumber: courierProfiles.plateNumber,
      rating: courierProfiles.rating,
      ratingCount: courierProfiles.ratingCount
    })
    .from(users)
    .leftJoin(courierProfiles, eq(courierProfiles.userId, users.id))
    .where(eq(users.id, courierId))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    initials: initials(row.name, 'C'),
    image: row.image,
    phone: row.phone,
    vehicleType: row.vehicleType,
    plateNumber: row.plateNumber,
    // An average over nothing is display noise, not a score — null until the
    // first rating actually exists.
    rating: row.rating != null && (row.ratingCount ?? 0) > 0 ? Number(row.rating) : null,
    ratingCount: row.ratingCount ?? 0,
    isDeleted: row.deletedAt != null
  };
}

/**
 * Write the address captured at sign-up, or a later correction to it.
 *
 * An upsert rather than an insert because `user_id` is unique and both callers —
 * the sign-up action and `PUT /api/business/profile` — mean "this is where the
 * business is now", not "this is a second location".
 */
export async function saveBusinessAddress(
  userId: string,
  input: { businessName: string; address: string } & LatLng
) {
  await db
    .insert(businessProfiles)
    .values({
      userId,
      businessName: input.businessName,
      address: input.address,
      latitude: toCoordinateColumn(input.lat),
      longitude: toCoordinateColumn(input.lng)
    })
    .onConflictDoUpdate({
      target: businessProfiles.userId,
      set: {
        businessName: input.businessName,
        address: input.address,
        latitude: toCoordinateColumn(input.lat),
        longitude: toCoordinateColumn(input.lng),
        updatedAt: new Date()
      }
    });
}
