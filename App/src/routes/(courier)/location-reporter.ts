/**
 * Publishing the courier's own position while a delivery is live.
 *
 * Only the pickup and deliver screens use this, so it lives in the courier
 * workspace. The business side of the same feature — receiving those positions
 * over Socket.IO — is `(business)/realtime`.
 */

const THROTTLE_MS = 2500;

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
  onUpdate?: (point: { lat: number; lng: number; recordedAt: string; stale: boolean }) => void;
  onError?: (code: 'denied' | 'unavailable') => void;
}) {
  let watchId: number | null = null;
  let lastSent = 0;
  let lastPoint: { lat: number; lng: number; recordedAt: string } | null = null;

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
      options.onUpdate?.({ ...point, stale: false });

      if (now - lastSent < THROTTLE_MS) return;
      lastSent = now;

      const payload = {
        tripId: options.tripId,
        lat: point.lat,
        lng: point.lng,
        heading: position.coords.heading,
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
          stale: Date.now() - new Date(lastPoint.recordedAt).getTime() > STALE_MS
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
