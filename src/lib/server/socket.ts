import type { Server as HttpServer } from 'node:http';

import { Server } from 'socket.io';

import { appEnv } from './env';

export function createRealtimeServer(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: appEnv.socketCorsOrigin === '*' ? true : appEnv.socketCorsOrigin,
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    socket.emit('yada:ready', {
      connectedAt: new Date().toISOString()
    });

    socket.on('trip:join', (tripId: string) => {
      socket.join(`trip:${tripId}`);
    });

    socket.on('trip:leave', (tripId: string) => {
      socket.leave(`trip:${tripId}`);
    });
  });

  return io;
}