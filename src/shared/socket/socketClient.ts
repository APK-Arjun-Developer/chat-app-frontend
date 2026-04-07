import { io, Socket } from 'socket.io-client';
import { env } from '../config/env';
import type { ClientToServerEvents, ServerToClientEvents } from '../../types';

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocketClient() {
  if (!socket) {
    socket = io(env.socketUrl, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });
  }

  return socket;
}

export function connectSocket() {
  const client = getSocketClient();
  if (!client.connected) {
    client.connect();
  }
  return client;
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect();
  }
}
