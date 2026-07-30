/**
 * Socket.IO connection handling, shared by `server.js` (production) and
 * `vite-plugin-socket-io.ts` (dev) so the two entry points cannot drift apart.
 *
 * Sockets carry the browser's cookies but never pass through SvelteKit's `handle`
 * hook, so none of the app's route guards apply to them. Authorization here works
 * by asking the app's own HTTP API: Better Auth stays the single source of truth
 * for sessions, and trip membership reuses the participant check that
 * `GET /api/trips` already enforces.
 *
 * Plain JS with no SvelteKit imports, because `server.js` runs outside Vite and
 * cannot resolve `$lib` / `$env` aliases.
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
    const response = await fetch(new URL('/api/auth/get-session', appOrigin), {
      headers: { cookie }
    });
    if (!response.ok) return null;

    const payload = await response.json().catch(() => null);
    const user = payload?.user ?? payload?.data?.user ?? null;

    return user?.id ? { id: user.id, role: user.role ?? 'business' } : null;
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
    const url = new URL('/api/trips', appOrigin);
    url.searchParams.set('id', tripId);

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
    const cookie = socket.handshake.headers.cookie ?? '';
    const user = await resolveSessionUser(getAppOrigin(), cookie);

    if (!user) {
      next(new Error('unauthorized'));
      return;
    }

    socket.data.user = user;
    socket.data.cookie = cookie;
    next();
  });

  io.on('connection', (socket) => {
    /** @type {SocketUser} */
    const user = socket.data.user;
    /** @type {string} */
    const cookie = socket.data.cookie;

    socket.emit('yada:ready', { connectedAt: new Date().toISOString() });

    // The live rider feed is business-facing. Couriers publish their own position
    // through POST /api/location and have no reason to read everyone else's.
    socket.on('dispatch:join', () => {
      if (user.role === 'business' || user.role === 'admin') {
        socket.join('dispatch:riders');
      }
    });

    socket.on('dispatch:leave', () => {
      socket.leave('dispatch:riders');
    });

    socket.on('trip:join', async (tripId) => {
      if (typeof tripId !== 'string' || tripId.length === 0) return;
      if (await isTripParticipant(getAppOrigin(), cookie, tripId)) {
        socket.join(`trip:${tripId}`);
      }
    });

    socket.on('trip:leave', (tripId) => {
      if (typeof tripId === 'string' && tripId.length > 0) {
        socket.leave(`trip:${tripId}`);
      }
    });

    // Deliberately no `rider:location` listener. Positions are broadcast only by
    // POST /api/location, which authenticates the courier, checks they own the
    // trip, and persists the fix before emitting. Rebroadcasting whatever a client
    // sent let anyone forge a courier's position on the dispatch map.
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
  if (address && typeof address === 'object') {
    const host = address.family === 'IPv6' ? '[::1]' : '127.0.0.1';
    return `http://${host}:${address.port}`;
  }

  return `http://127.0.0.1:${fallbackPort}`;
}
