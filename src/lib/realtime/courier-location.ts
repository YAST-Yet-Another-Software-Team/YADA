import { emitRiderLocation } from '$lib/realtime/client';

const THROTTLE_MS = 2500;
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

      emitRiderLocation(payload);
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

export { STALE_MS as LOCATION_STALE_MS };
