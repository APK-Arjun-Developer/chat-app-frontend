import { useCallback, useEffect } from 'react';
import { connectSocket, disconnectSocket } from '../../../shared/socket/socketClient';
import {
  emitChatMessage,
  emitStopTyping,
  emitTyping,
  registerChatListeners,
} from '../services/chatSocketService';
import { useChatStore } from '../store/chatStore';

export function useChatSocket(groupId: string | null) {
  const {
    setConnectionStatus,
    setErrorMessage,
    pushMessage,
    setTypingUser,
    removeTypingUser,
  } = useChatStore();

  useEffect(() => {
    const socket = connectSocket();
    setConnectionStatus('connecting');

    const onConnect = () => setConnectionStatus('connected');
    const onDisconnect = () => setConnectionStatus('disconnected');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    const cleanupChatListeners = registerChatListeners(socket, {
      onMessage: (message) => {
        pushMessage(message);
      },
      onTyping: (userId, username, typingGroupId) => {
        if (typingGroupId === groupId) {
          setTypingUser(typingGroupId, userId, username);
        }
      },
      onStopTyping: (userId, typingGroupId) => {
        if (typingGroupId === groupId) {
          removeTypingUser(typingGroupId, userId);
        }
      },
      onError: (message) => {
        setConnectionStatus('error');
        setErrorMessage(message);
      },
    });

    return () => {
      cleanupChatListeners();
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      disconnectSocket();
    };
  }, [groupId, pushMessage, removeTypingUser, setConnectionStatus, setErrorMessage, setTypingUser]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!groupId) return;
      const socket = connectSocket();
      emitChatMessage(socket, groupId, text.trim());
    },
    [groupId],
  );

  const startTyping = useCallback(() => {
    if (!groupId) return;
    emitTyping(connectSocket(), groupId);
  }, [groupId]);

  const stopTyping = useCallback(() => {
    if (!groupId) return;
    emitStopTyping(connectSocket(), groupId);
  }, [groupId]);

  return {
    sendMessage,
    startTyping,
    stopTyping,
  };
}
