import { io, type Socket } from 'socket.io-client';

export type RiderLocationEvent = {
  courierId?: string;
  tripId: string | null;
  lat: number;
  lng: number;
  heading?: number | null;
  recordedAt: string;
};

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

export function emitRiderLocation(payload: RiderLocationEvent) {
  const s = getRealtimeSocket();
  s?.emit('rider:location', payload);
}
