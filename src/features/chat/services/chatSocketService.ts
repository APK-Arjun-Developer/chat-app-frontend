import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, Message, ServerToClientEvents } from '../../../types';

export type MessageHandler = (payload: Message) => void;

export function registerChatListeners(
  socket: Socket<ServerToClientEvents, ClientToServerEvents>,
  handlers: {
    onMessage: MessageHandler;
    onTyping: (userId: string, username: string, groupId: string) => void;
    onStopTyping: (userId: string, groupId: string) => void;
    onError: (message: string) => void;
  },
) {
  socket.on('message', handlers.onMessage);
  socket.on('typing', handlers.onTyping);
  socket.on('stopTyping', handlers.onStopTyping);
  socket.on('error', handlers.onError);

  return () => {
    socket.off('message', handlers.onMessage);
    socket.off('typing', handlers.onTyping);
    socket.off('stopTyping', handlers.onStopTyping);
    socket.off('error', handlers.onError);
  };
}

export function emitChatMessage(
  socket: Socket<ServerToClientEvents, ClientToServerEvents>,
  groupId: string,
  text: string,
) {
  socket.emit('message', groupId, text);
}

export function emitTyping(
  socket: Socket<ServerToClientEvents, ClientToServerEvents>,
  groupId: string,
) {
  socket.emit('typing', groupId);
}

export function emitStopTyping(
  socket: Socket<ServerToClientEvents, ClientToServerEvents>,
  groupId: string,
) {
  socket.emit('stopTyping', groupId);
}
