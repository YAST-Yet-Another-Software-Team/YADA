import type { Plugin } from 'vite';
import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';

import { attachRealtimeHandlers, loopbackOrigin } from './realtime-handlers.js';

const GLOBAL_KEY = '__yada_socket_io__';
const DEFAULT_DEV_PORT = 5173;

/**
 * Attaches Socket.IO to Vite's HTTP server during `vite dev`.
 * Uses the same global singleton as `src/lib/server/realtime/instance.ts`, and the
 * same authenticated connection handling as production — see realtime-handlers.js.
 */
export function socketIoDevPlugin(): Plugin {
  return {
    name: 'yada-socket-io-dev',
    configureServer(server) {
      const httpServer = server.httpServer as HttpServer | null;
      if (!httpServer) return;

      const existing = (globalThis as Record<string, unknown>)[GLOBAL_KEY];
      if (existing) return;

      const io = new Server(httpServer, {
        path: '/socket.io',
        cors: {
          origin: true,
          credentials: true
        }
      });

      (globalThis as Record<string, unknown>)[GLOBAL_KEY] = io;

      attachRealtimeHandlers(io, {
        // Resolved per call: the dev server's port is only known once it is listening.
        getAppOrigin: () => loopbackOrigin(httpServer.address(), DEFAULT_DEV_PORT)
      });

      console.info('[yada] Socket.IO attached to Vite dev server');
    }
  };
}
