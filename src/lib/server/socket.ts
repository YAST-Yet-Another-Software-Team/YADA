import type { Server as HttpServer } from 'node:http';
import type { Server as HttpsServer } from 'node:https';
import { Server } from 'socket.io';

import { appEnv } from './env';
import { setIo } from './socket-instance';

export type RiderLocationPayload = {
  courierId?: string;
  tripId: string | null;
  lat: number;
  lng: number;
  heading?: number | null;
  recordedAt: string;
};

export function createRealtimeServer(server: HttpServer | HttpsServer) {
  const io = new Server(server, {
    path: '/socket.io',
    cors: {
      origin: appEnv.socketCorsOrigin === '*' ? true : appEnv.socketCorsOrigin,
      credentials: true
    }
  });

  setIo(io);

  io.on('connection', (socket) => {
    socket.emit('yada:ready', {
      connectedAt: new Date().toISOString()
    });

    socket.on('trip:join', (tripId: string) => {
      if (typeof tripId === 'string' && tripId.length > 0) {
        socket.join(`trip:${tripId}`);
      }
    });

    socket.on('trip:leave', (tripId: string) => {
      if (typeof tripId === 'string' && tripId.length > 0) {
        socket.leave(`trip:${tripId}`);
      }
    });

    socket.on('dispatch:join', () => {
      socket.join('dispatch:riders');
    });

    socket.on('dispatch:leave', () => {
      socket.leave('dispatch:riders');
    });

    socket.on('rider:location', (payload: RiderLocationPayload) => {
      if (!payload || typeof payload.lat !== 'number' || typeof payload.lng !== 'number') {
        return;
      }
      const recordedAt = payload.recordedAt || new Date().toISOString();
      const message = { ...payload, recordedAt };
      if (payload.tripId) {
        socket.to(`trip:${payload.tripId}`).emit('rider:location', message);
      }
      socket.to('dispatch:riders').emit('rider:location', message);
    });
  });

  return io;
}
