import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { handler } from './build/handler.js';

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
const corsOrigin = process.env.SOCKET_CORS_ORIGIN || '*';

const server = createServer(handler);

const io = new Server(server, {
  path: '/socket.io',
  cors: {
    origin: corsOrigin === '*' ? true : corsOrigin,
    credentials: true
  }
});

globalThis.__yada_socket_io__ = io;

io.on('connection', (socket) => {
  socket.emit('yada:ready', { connectedAt: new Date().toISOString() });

  socket.on('trip:join', (tripId) => {
    if (typeof tripId === 'string' && tripId.length > 0) socket.join(`trip:${tripId}`);
  });

  socket.on('trip:leave', (tripId) => {
    if (typeof tripId === 'string' && tripId.length > 0) socket.leave(`trip:${tripId}`);
  });

  socket.on('dispatch:join', () => socket.join('dispatch:riders'));
  socket.on('dispatch:leave', () => socket.leave('dispatch:riders'));

  socket.on('rider:location', (payload) => {
    if (!payload || typeof payload.lat !== 'number' || typeof payload.lng !== 'number') return;
    const message = { ...payload, recordedAt: payload.recordedAt || new Date().toISOString() };
    if (payload.tripId) socket.to(`trip:${payload.tripId}`).emit('rider:location', message);
    socket.to('dispatch:riders').emit('rider:location', message);
  });
});

server.listen(port, host, () => {
  console.info(`[yada] listening on http://${host}:${port}`);
});
