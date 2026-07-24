import type { Plugin } from 'vite';
import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';

const GLOBAL_KEY = '__yada_socket_io__';

/**
 * Attaches Socket.IO to Vite's HTTP server during `vite dev`.
 * Uses the same global singleton as `src/lib/server/socket-instance.ts`.
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

      io.on('connection', (socket) => {
        socket.emit('yada:ready', { connectedAt: new Date().toISOString() });

        socket.on('trip:join', (tripId: string) => {
          if (typeof tripId === 'string' && tripId.length > 0) socket.join(`trip:${tripId}`);
        });

        socket.on('trip:leave', (tripId: string) => {
          if (typeof tripId === 'string' && tripId.length > 0) socket.leave(`trip:${tripId}`);
        });

        socket.on('dispatch:join', () => socket.join('dispatch:riders'));
        socket.on('dispatch:leave', () => socket.leave('dispatch:riders'));

        socket.on(
          'rider:location',
          (payload: {
            tripId?: string | null;
            lat?: number;
            lng?: number;
            recordedAt?: string;
          }) => {
            if (!payload || typeof payload.lat !== 'number' || typeof payload.lng !== 'number') {
              return;
            }
            const message = {
              ...payload,
              recordedAt: payload.recordedAt || new Date().toISOString()
            };
            if (payload.tripId) socket.to(`trip:${payload.tripId}`).emit('rider:location', message);
            socket.to('dispatch:riders').emit('rider:location', message);
          }
        );
      });

      console.info('[yada] Socket.IO attached to Vite dev server');
    }
  };
}
