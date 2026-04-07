import { create } from 'zustand';
import type { Message } from '../../../types';

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

interface ChatState {
  activeGroupId: string | null;
  messagesByGroup: Record<string, Message[]>;
  typingByGroup: Record<string, Record<string, string>>;
  connectionStatus: ConnectionStatus;
  errorMessage: string | null;
  setActiveGroup: (groupId: string | null) => void;
  pushMessage: (message: Message) => void;
  clearGroupMessages: (groupId: string) => void;
  setTypingUser: (groupId: string, userId: string, username: string) => void;
  removeTypingUser: (groupId: string, userId: string) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setErrorMessage: (message: string | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeGroupId: null,
  messagesByGroup: {},
  typingByGroup: {},
  connectionStatus: 'idle',
  errorMessage: null,

  setActiveGroup: (groupId) => set({ activeGroupId: groupId }),

  pushMessage: (message) =>
    set((state) => {
      const list = state.messagesByGroup[message.groupId] ?? [];
      if (list.some((item) => item.id === message.id)) {
        return state;
      }

      return {
        messagesByGroup: {
          ...state.messagesByGroup,
          [message.groupId]: [...list, message],
        },
      };
    }),

  clearGroupMessages: (groupId) =>
    set((state) => ({
      messagesByGroup: {
        ...state.messagesByGroup,
        [groupId]: [],
      },
    })),

  setTypingUser: (groupId, userId, username) =>
    set((state) => ({
      typingByGroup: {
        ...state.typingByGroup,
        [groupId]: {
          ...(state.typingByGroup[groupId] ?? {}),
          [userId]: username,
        },
      },
    })),

  removeTypingUser: (groupId, userId) =>
    set((state) => {
      const groupTyping = { ...(state.typingByGroup[groupId] ?? {}) };
      delete groupTyping[userId];

      return {
        typingByGroup: {
          ...state.typingByGroup,
          [groupId]: groupTyping,
        },
      };
    }),

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setErrorMessage: (message) => set({ errorMessage: message }),
}));
