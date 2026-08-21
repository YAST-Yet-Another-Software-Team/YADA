import { eq } from "drizzle-orm";

import { normalisePlate } from "$lib/shared/plate";
import { initials } from "$lib/shared/text";

import { db } from "../db";
import { courierProfiles } from "../db/schema";

/**
 * The `courier_profiles` row: who a rider is to the system, as distinct from
 * what they are currently carrying (`./courier-trips`) or who is being rung for
 * a job right now (`./dispatch`).
 *
 * Everything here is keyed on `user_id`, which is unique as of migration `0012`
 * — that constraint is what lets these be plain single-row reads and one real
 * upsert rather than a set of "whichever row comes back first" queries.
 */

export function courierProfileOf(
  name: string | null | undefined,
  fallback = "Courier",
) {
  const displayName = name || fallback;
  return { name: displayName, initials: initials(displayName, "C") };
}

/**
 * The courier's own standing: the cached average and how many verdicts stand
 * behind it. A rating drives behaviour only if the rider actually sees it, so
 * their screens read the same cache the matching rubric ranks by.
 */
export async function getCourierRating(userId: string) {
  const [row] = await db
    .select({
      rating: courierProfiles.rating,
      ratingCount: courierProfiles.ratingCount,
    })
    .from(courierProfiles)
    .where(eq(courierProfiles.userId, userId))
    .limit(1);

  return {
    average: row && row.ratingCount > 0 ? Number(row.rating) : null,
    count: row?.ratingCount ?? 0,
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
export const COURIER_VEHICLE_TYPE = "Motorbike";

/**
 * A plate as it should be stored. Defined in `$lib/shared/plate` rather than
 * here, because the same shaping now runs in the field as the rider types it and
 * a component cannot import `$lib/server`. Re-exported so this module's callers,
 * and anything importing it by habit, do not have to move.
 */
export { normalisePlate };

/**
 * Create or update the courier's profile row.
 *
 * Nothing created one before: only the dev seed did, so a courier who actually
 * registered had a user record and no profile. `POST /api/location` writes the
 * live position into this table, and an update against a row that isn't there
 * changes nothing — their position was silently dropped on every fix, which is
 * also why the business map and the proximity checks had nothing to read.
 *
 * A real upsert, on the `user_id` unique constraint added in `0012`. It used to
 * be a SELECT followed by an INSERT, which is the same race it was meant to
 * close: a retried sign-up or a double-submitted settings form could have both
 * calls miss the row and both insert, leaving two profiles and making "the
 * courier's profile" whichever one a LIMIT 1 happened to return. Letting
 * Postgres arbitrate is the only version of this that is actually atomic.
 */
export async function saveCourierProfile(
  userId: string,
  input: { vehicleType?: string; plateNumber?: string | null } = {},
) {
  const vehicleType = input.vehicleType ?? COURIER_VEHICLE_TYPE;
  // Absent means "leave it alone" — sign-up doesn't ask for a plate, and the
  // settings form that does must not be able to wipe it by omission.
  const plate =
    input.plateNumber === undefined
      ? undefined
      : normalisePlate(input.plateNumber);

  await db
    .insert(courierProfiles)
    .values({ userId, vehicleType, plateNumber: plate ?? null })
    .onConflictDoUpdate({
      target: courierProfiles.userId,
      set: {
        vehicleType,
        ...(plate === undefined ? {} : { plateNumber: plate }),
        updatedAt: new Date(),
      },
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

/** The courier's own profile, for the screens that let them edit it. */
export async function getCourierProfile(userId: string) {
  const [row] = await db
    .select({
      vehicleType: courierProfiles.vehicleType,
      plateNumber: courierProfiles.plateNumber,
    })
    .from(courierProfiles)
    .where(eq(courierProfiles.userId, userId))
    .limit(1);

  return {
    vehicleType: row?.vehicleType ?? COURIER_VEHICLE_TYPE,
    plateNumber: row?.plateNumber ?? null,
  };
}
