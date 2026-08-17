/**
 * Publishing the courier's own position while a delivery is live.
 *
 * Only the pickup and deliver screens use this, so it lives in the courier
 * workspace. The business side of the same feature — receiving those positions
 * over Socket.IO — is `(business)/realtime`.
 */

import { createHeadingTracker } from '$lib/shared/geo/heading';

/**
 * How often a fix is actually POSTed, by what the courier is doing.
 *
 * On a live trip the business is watching the rider dot move and both handover
 * confirmations gate on a fix newer than two minutes, so that cadence has to
 * stay fast. An idle courier is only reporting so dispatch can find them, and
 * dispatch reads whatever the latest fix is — a rider ten seconds out of date is
 * still in the right ring. Idle is the common case (most online couriers,
 * most of the time), and at 2.5 s it was the single largest source of API
 * requests in the app: ~1,440/hour each, against a 100k/day budget.
 */
const ACTIVE_THROTTLE_MS = 2500;
const IDLE_THROTTLE_MS = 10_000;

/**
 * How old the last fix may be before it's reported as stale. The business map
 * applies the same 30s policy to what it receives, as its own constant.
 */
const STALE_MS = 30_000;

/**
 * Watch device GPS while a courier is on an active delivery and
 * push updates to /api/location + Socket.IO.
 */
export function startCourierLocationReporter(options: {
  tripId: string | null;
  enabled: boolean;
  onUpdate?: (point: {
    lat: number;
    lng: number;
    recordedAt: string;
    stale: boolean;
    /** Which way they are going, 0–360° from north, or null while unknown. */
    heading: number | null;
  }) => void;
  onError?: (code: 'denied' | 'unavailable') => void;
}) {
  // A trip id is what separates the two cadences: it is only ever set by the
  // pickup and deliver screens, and by the home screen when that courier has a
  // delivery running. No trip, nobody watching — report slowly.
  const throttleMs = options.tripId ? ACTIVE_THROTTLE_MS : IDLE_THROTTLE_MS;

  let watchId: number | null = null;
  let lastSent = 0;
  let lastPoint: { lat: number; lng: number; recordedAt: string } | null = null;
  let lastHeading: number | null = null;

  /**
   * The rider's direction, from the device where it offers one and from the
   * trail of fixes where it does not.
   *
   * Worth deriving rather than passing `coords.heading` straight through: that
   * field is null on every desktop browser and on a phone that is not moving,
   * which is most of the fixes this sends — and the business watching the map
   * still wants to know which way their rider is pointing.
   */
  const heading = createHeadingTracker();

  function stop() {
    if (watchId != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  }

  if (!options.enabled || typeof navigator === 'undefined' || !navigator.geolocation) {
    options.onError?.('unavailable');
    return stop;
  }

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      const now = Date.now();
      const recordedAt = new Date(position.timestamp || now).toISOString();
      const point = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        recordedAt
      };
      lastPoint = point;
      lastHeading = heading.next(point, position.coords.heading);
      options.onUpdate?.({ ...point, stale: false, heading: lastHeading });

      if (now - lastSent < throttleMs) return;
      lastSent = now;

      const payload = {
        tripId: options.tripId,
        lat: point.lat,
        lng: point.lng,
        heading: lastHeading,
        recordedAt
      };

      // POST only — the endpoint persists the fix and then broadcasts it over
      // Socket.IO itself, so there is nothing for the client to emit.
      void fetch('/api/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {
        // keep UI on last known
      });
    },
    () => {
      options.onError?.('denied');
      if (lastPoint) {
        options.onUpdate?.({
          ...lastPoint,
          stale: Date.now() - new Date(lastPoint.recordedAt).getTime() > STALE_MS,
          heading: lastHeading
        });
      }
    },
    {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 10000
    }
  );

  return stop;
}
