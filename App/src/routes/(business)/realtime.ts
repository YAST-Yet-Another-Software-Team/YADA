import { io, type Socket } from "socket.io-client";

import type { RiderLocationEvent } from "$lib/utils/types";

/**
 * The business workspace's live connection.
 *
 * Only `(business)` reads live rider positions — tracking watches one trip — so
 * this sits in the route group rather than `$lib`. Couriers publish their
 * position through `POST /api/location`, which is a different mechanism
 * entirely (see `(courier)/location-reporter`).
 */

let socket: Socket | null = null;
let enabled = true;

/**
 * Turn the socket layer off where nothing is listening.
 *
 * Cloudflare Workers has no always-on process for Socket.IO to attach to, so
 * `io()` there would retry forever — a reconnect storm against the request
 * quota. The root layout calls this with the server's `REALTIME_ENABLED`.
 *
 * Module scope rather than context — unlike the Maps config this is only ever
 * read in the browser (`getRealtimeSocket` refuses on the server), so there is
 * no in-flight SSR request to leak it between.
 */
export function setRealtimeEnabled(value: boolean) {
  enabled = value;

  if (!value && socket) {
    socket.close();
    socket = null;
  }
}

function getRealtimeSocket() {
  if (typeof window === "undefined") return null;
  if (!enabled) return null;
  if (socket) return socket;

  socket = io({
    path: "/socket.io",
    transports: ["websocket", "polling"],
    withCredentials: true,
    autoConnect: true,
  });

  return socket;
}

/**
 * Whether live fixes can arrive at all. Tracking needs this to know whether the
 * polled fix is a seed for the socket or the only source it will ever get.
 */
export function isRealtimeEnabled() {
  return enabled;
}

export function joinTripRoom(tripId: string) {
  const s = getRealtimeSocket();
  s?.emit("trip:join", tripId);
}

export function leaveTripRoom(tripId: string) {
  const s = getRealtimeSocket();
  s?.emit("trip:leave", tripId);
}

export function onRiderLocation(
  handler: (payload: RiderLocationEvent) => void,
) {
  const s = getRealtimeSocket();
  if (!s) return () => {};
  s.on("rider:location", handler);
  return () => {
    s.off("rider:location", handler);
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
