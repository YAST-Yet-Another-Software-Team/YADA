/**
 * Socket.IO connection handling. Development only.
 *
 * The single entry point is `vite-plugin-socket-io.ts`, which attaches a socket
 * server to the Vite dev server. There is no production counterpart: Cloudflare
 * Workers is the only deployment target and has no always-on process for a
 * socket server to live in, so `REALTIME_ENABLED` is `false` there and the
 * business tracking screen falls back to polling `GET /api/trips`. This exists
 * so that fallback is not the *only* thing anyone ever exercises — live fixes
 * are the behaviour the DO-based replacement is meant to restore, and it helps
 * to be able to see them working.
 *
 * Sockets carry the browser's cookies but never pass through SvelteKit's `handle`
 * hook, so none of the app's route guards apply to them. Authorization here works
 * by asking the app's own HTTP API: Better Auth stays the single source of truth
 * for sessions, and trip membership reuses the participant check that
 * `GET /api/trips` already enforces.
 *
 * Plain JS with no SvelteKit imports: it is loaded from the Vite *config*, which
 * is evaluated before the `$lib` / `$env` aliases exist.
 */

/** @typedef {{ id: string, role: string }} SocketUser */

/**
 * Resolve the signed-in user behind a socket handshake, or null.
 *
 * @param {string} appOrigin
 * @param {string} cookie
 * @returns {Promise<SocketUser | null>}
 */
async function resolveSessionUser(appOrigin, cookie) {
  if (!cookie) return null;

  try {
    const response = await fetch(new URL("/api/auth/get-session", appOrigin), {
      headers: { cookie },
    });
    if (!response.ok) return null;

    const payload = await response.json().catch(() => null);
    const user = payload?.user ?? payload?.data?.user ?? null;

    return user?.id ? { id: user.id, role: user.role ?? "business" } : null;
  } catch {
    return null;
  }
}

/**
 * A trip is visible to its business and its assigned courier. GET /api/trips
 * answers 404 for anyone else, so a successful read is the membership proof.
 *
 * @param {string} appOrigin
 * @param {string} cookie
 * @param {string} tripId
 * @returns {Promise<boolean>}
 */
async function isTripParticipant(appOrigin, cookie, tripId) {
  try {
    const url = new URL("/api/trips", appOrigin);
    url.searchParams.set("id", tripId);

    const response = await fetch(url, { headers: { cookie } });
    if (!response.ok) return false;

    const payload = await response.json().catch(() => null);
    return payload?.ok === true;
  } catch {
    return false;
  }
}

/**
 * @param {import('socket.io').Server} io
 * @param {{ getAppOrigin: () => string }} options
 */
export function attachRealtimeHandlers(io, { getAppOrigin }) {
  // Reject anonymous sockets at the handshake rather than at each event, so an
  // unauthenticated client never reaches a room in the first place.
  io.use(async (socket, next) => {
    const cookie = socket.handshake.headers.cookie ?? "";
    const user = await resolveSessionUser(getAppOrigin(), cookie);

    if (!user) {
      next(new Error("unauthorized"));
      return;
    }

    socket.data.user = user;
    socket.data.cookie = cookie;
    next();
  });

  io.on("connection", (socket) => {
    // The handshake already rejected anonymous sockets; per-room authorization
    // is checked at join time, so the resolved user isn't needed again here.
    /** @type {string} */
    const cookie = socket.data.cookie;

    socket.emit("yada:ready", { connectedAt: new Date().toISOString() });

    socket.on("trip:join", async (tripId) => {
      if (typeof tripId !== "string" || tripId.length === 0) return;
      if (await isTripParticipant(getAppOrigin(), cookie, tripId)) {
        socket.join(`trip:${tripId}`);
      }
    });

    socket.on("trip:leave", (tripId) => {
      if (typeof tripId === "string" && tripId.length > 0) {
        socket.leave(`trip:${tripId}`);
      }
    });

    // Deliberately no `rider:location` listener. Positions are broadcast only by
    // POST /api/location, which authenticates the courier, checks they own the
    // trip, and persists the fix before emitting. Rebroadcasting whatever a client
    // sent let anyone forge a courier's position.
  });
}

/**
 * Loopback origin for the server to call its own HTTP API.
 *
 * @param {import('node:net').AddressInfo | string | null} address
 * @param {number} fallbackPort
 * @returns {string}
 */
export function loopbackOrigin(address, fallbackPort) {
  if (address && typeof address === "object") {
    const host = address.family === "IPv6" ? "[::1]" : "127.0.0.1";
    return `http://${host}:${address.port}`;
  }

  return `http://127.0.0.1:${fallbackPort}`;
}
