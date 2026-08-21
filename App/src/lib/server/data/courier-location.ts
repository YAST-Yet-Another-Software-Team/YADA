import { eq } from "drizzle-orm";

import {
  isWithinRange,
  LOCATION_FRESHNESS_MS,
  metresBetween,
} from "$lib/shared/geo/proximity";
import type { LatLng } from "$lib/utils/types";

import { db } from "../db";
import { courierProfiles } from "../db/schema";

/** The courier's last stored fix, or null if they have never reported one. */
export async function getCourierFix(courierId: string) {
  const [profile] = await db
    .select({
      lat: courierProfiles.currentLatitude,
      lng: courierProfiles.currentLongitude,
      recordedAt: courierProfiles.lastLocationAt,
    })
    .from(courierProfiles)
    .where(eq(courierProfiles.userId, courierId))
    .limit(1);

  if (!profile?.lat || !profile.lng || !profile.recordedAt) return null;

  return {
    point: { lat: Number(profile.lat), lng: Number(profile.lng) },
    recordedAt: profile.recordedAt,
  };
}

/**
 * Whether the courier is standing where a phase can be closed.
 *
 * Read from the database rather than taken from the request that wants to close
 * it. That matters twice over: the position gating the button is then the same
 * one the business watched cross their map, and neither party can claim a
 * handover from somewhere else — the business confirming a pickup is trusted
 * about the parcel, not about where the rider is.
 */
export async function courierWithinRange(
  courierId: string,
  target: LatLng,
  radiusKm: number,
  place: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const fix = await getCourierFix(courierId);

  // Worded without a subject: the same refusal is read by the business
  // confirming a pickup and by the courier confirming a delivery.
  if (!fix) {
    return {
      ok: false,
      message: `No rider location yet, so the ${place} can't be confirmed.`,
    };
  }

  if (Date.now() - fix.recordedAt.getTime() > LOCATION_FRESHNESS_MS) {
    return {
      ok: false,
      message: `The last rider location is too old to confirm the ${place}. Check location is on and try again.`,
    };
  }

  if (!isWithinRange(fix.point, target, radiusKm)) {
    return {
      ok: false,
      message: `The last rider location is ${metresBetween(fix.point, target)} m from the ${place} — too far to confirm.`,
    };
  }

  return { ok: true };
}
