import type { Server } from 'socket.io';

const globalKey = '__yada_socket_io__';

type GlobalIo = typeof globalThis & {
  [globalKey]?: Server | null;
};

export function setIo(instance: Server | null) {
  (globalThis as GlobalIo)[globalKey] = instance;
}

export function getIo(): Server | null {
  return (globalThis as GlobalIo)[globalKey] ?? null;
}
