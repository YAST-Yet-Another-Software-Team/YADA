import { io, type Socket } from 'socket.io-client';

import type { RiderLocationEvent } from '$lib/utils/types';

/**
 * The business workspace's live connection.
 *
 * Only `(business)` reads live rider positions — the map watches every courier,
 * tracking watches one trip — so this sits in the route group rather than
 * `$lib`. Couriers publish their position through `POST /api/location`, which is
 * a different mechanism entirely (see `(courier)/courier/location-reporter`).
 */

let socket: Socket | null = null;

function getRealtimeSocket() {
  if (typeof window === 'undefined') return null;
  if (socket) return socket;

  socket = io({
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    withCredentials: true,
    autoConnect: true
  });

  return socket;
}

export function joinTripRoom(tripId: string) {
  const s = getRealtimeSocket();
  s?.emit('trip:join', tripId);
}

export function leaveTripRoom(tripId: string) {
  const s = getRealtimeSocket();
  s?.emit('trip:leave', tripId);
}

export function joinDispatchRiders() {
  const s = getRealtimeSocket();
  s?.emit('dispatch:join');
}

export function leaveDispatchRiders() {
  const s = getRealtimeSocket();
  s?.emit('dispatch:leave');
}

export function onRiderLocation(handler: (payload: RiderLocationEvent) => void) {
  const s = getRealtimeSocket();
  if (!s) return () => {};
  s.on('rider:location', handler);
  return () => {
    s.off('rider:location', handler);
  };
}

// Locations are published by POST /api/location, which authenticates the courier
// and broadcasts server-side. There is deliberately no client emit: the server
// does not accept `rider:location` from sockets.

/**
 * How old a rider's last fix may be before the map shows it as stale.
 *
 * The courier app applies the same 30s policy to its own last known point when
 * GPS drops out; the two are separate constants because the two workspaces are
 * separate. Change one and consider the other.
 */
export const LOCATION_STALE_MS = 30_000;
