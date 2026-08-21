import type { Plugin } from "vite";
import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";

import { attachRealtimeHandlers, loopbackOrigin } from "./realtime-handlers.js";

const GLOBAL_KEY = "__yada_socket_io__";
const DEFAULT_DEV_PORT = 5173;

/**
 * Attaches Socket.IO to Vite's HTTP server during `vite dev`. Development only —
 * there is no production counterpart, because Cloudflare Workers has no
 * always-on process for a socket server to attach to. In deployment
 * `REALTIME_ENABLED` is `false` and tracking falls back to polling.
 *
 * Uses the same global singleton `src/lib/server/realtime/instance.ts` reads, so
 * `POST /api/location` can broadcast a fix without knowing any of this exists —
 * `getIo()` simply answers null where there is no server.
 */
export function socketIoDevPlugin(): Plugin {
  return {
    name: "yada-socket-io-dev",
    configureServer(server) {
      const httpServer = server.httpServer as HttpServer | null;
      if (!httpServer) return;

      const existing = (globalThis as Record<string, unknown>)[GLOBAL_KEY];
      if (existing) return;

      // Reflects whatever origin asks. Acceptable only because this never runs
      // outside `vite dev`: the same dev server is reached as localhost, as
      // 127.0.0.1, and as a LAN address from a phone testing the courier
      // screens, and pinning one of those breaks the other two. These sockets
      // authenticate with the session cookie, so anywhere the cookie is real
      // this would be a cross-site WebSocket hijacking hole — if a production
      // socket server ever appears, it needs an explicit origin allowlist.
      const io = new Server(httpServer, {
        path: "/socket.io",
        cors: {
          origin: true,
          credentials: true,
        },
      });

      (globalThis as Record<string, unknown>)[GLOBAL_KEY] = io;

      attachRealtimeHandlers(io, {
        // Resolved per call: the dev server's port is only known once it is listening.
        getAppOrigin: () =>
          loopbackOrigin(httpServer.address(), DEFAULT_DEV_PORT),
      });

      console.info("[yada] Socket.IO attached to Vite dev server");
    },
  };
}
