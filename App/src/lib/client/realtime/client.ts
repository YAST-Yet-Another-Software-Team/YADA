import { io, type Socket } from 'socket.io-client';

import type { RiderLocationEvent } from '$lib/utils/types';

let socket: Socket | null = null;

export function getRealtimeSocket() {
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
