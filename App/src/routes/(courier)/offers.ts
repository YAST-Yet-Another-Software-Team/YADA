/**
 * Accepting and declining an offer, in one place.
 *
 * Both the Home sheet and the Orders list put these two buttons in front of the
 * rider, and an offer that behaved differently depending on which screen it was
 * tapped from would be a bug nobody would think to look for. The screens own the
 * pending state and the error copy they show; what happens on the wire is here.
 */

type Result = { ok: true; tripId: string } | { ok: false; message: string };

export async function acceptOffer(tripId: string): Promise<Result> {
  try {
    const response = await fetch('/api/courier/accept-trip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId })
    });

    const payload = await response.json().catch(() => null);

    // A race the rider will actually hit: two couriers tap Accept on the same
    // offer and one of them loses. The server's message says so; inventing our
    // own here would make it sound like their app broke.
    if (!response.ok || !payload?.ok) {
      return { ok: false, message: payload?.message ?? 'That request is no longer available.' };
    }

    return { ok: true, tripId: payload.tripId ?? tripId };
  } catch {
    return { ok: false, message: 'Could not accept — check your connection and try again.' };
  }
}

export async function declineOffer(tripId: string): Promise<Result> {
  try {
    const response = await fetch('/api/courier/decline-trip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId })
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return { ok: false, message: payload?.message ?? 'Could not decline that request.' };
    }

    return { ok: true, tripId };
  } catch {
    return { ok: false, message: 'Could not decline — check your connection and try again.' };
  }
}

/** `0:12`, the way a countdown is read. */
export function countdownLabel(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

/** Distance the way a rider says it: metres up close, kilometres beyond. */
export function distanceLabel(km: number | null | undefined) {
  if (km == null) return null;
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

/** Turn-by-turn in whatever map app the phone prefers. */
export function directionsHref(point: { lat: number; lng: number }) {
  return `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}&travelmode=driving`;
}
