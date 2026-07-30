import 'dotenv/config';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { handler } from './build/handler.js';
import { attachRealtimeHandlers, loopbackOrigin } from './realtime-handlers.js';

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

attachRealtimeHandlers(io, {
  getAppOrigin: () => loopbackOrigin(server.address(), port)
});

server.listen(port, host, () => {
  console.info(`[yada] listening on http://${host}:${port}`);
});
