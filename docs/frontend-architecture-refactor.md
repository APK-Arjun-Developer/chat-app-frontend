# Frontend Architecture Refactor Guide (React + TypeScript + Socket.IO)

## 1) Target architecture

Use a **feature-based modular architecture** with thin app-level wiring and isolated domain modules.

- `app/`: composition root (providers, router, app bootstrap)
- `shared/`: cross-feature infrastructure (socket client, env config, ui primitives)
- `features/chat`: chat-specific UI, hooks, store slice, and socket service
- `features/user`, `features/notifications`: same shape as chat for scalability

### Why this is scalable

- Socket setup is centralized in `shared/socket/socketClient.ts`.
- Socket events and emitters are isolated in `features/chat/services/chatSocketService.ts`.
- Business state lives in a dedicated store (`features/chat/store/chatStore.ts`).
- Components become mostly presentational (`features/chat/components/ChatRoom.tsx`).

## 2) Proposed folder structure

```text
src/
  app/
    providers/
    routes/
    App.tsx
  shared/
    config/
      env.ts
    socket/
      socketClient.ts
    ui/
  features/
    chat/
      components/
        ChatRoom.tsx
      hooks/
        useChatSocket.ts
      pages/
        ChatPage.tsx
      services/
        chatSocketService.ts
      store/
        chatStore.ts
    user/
      components/
      hooks/
      services/
      store/
    notifications/
      components/
      hooks/
      services/
      store/
  types/
```

## 3) Before vs after (high-level)

### Before

- Single large component (`src/App.tsx`) owning UI, socket lifecycle, emits, listeners, state mutations.
- Hard to test and reason about event ownership.
- Higher chance of duplicate listeners and memory leaks.

### After

- App/page only composes feature components and passes IDs/route params.
- Hook (`useChatSocket`) manages socket lifecycle and delegates listeners to service.
- Store handles deterministic state updates and de-duplication.
- Socket service is the only layer aware of event names.

## 4) Socket architecture pattern

- **Client setup**: one singleton connection factory in `shared/socket/socketClient.ts`.
- **Listeners**: `registerChatListeners()` in `chatSocketService.ts` returns cleanup function.
- **Emit API**: `emitChatMessage`, `emitTyping`, `emitStopTyping` functions.
- **Hook orchestration**: `useChatSocket(groupId)` wires setup/cleanup + maps events to store actions.

## 5) State management recommendation

- **Context API**: acceptable for small apps or low-frequency updates.
- **Zustand** (recommended here): lightweight, selective subscriptions, lower boilerplate.
- **Redux Toolkit**: best when you need strict event logs, middleware-heavy workflows, or large teams.

### Socket sync strategy

- Listener receives event payload.
- Hook validates context (e.g., active group).
- Hook dispatches store action (`pushMessage`, `setTypingUser`, etc.).
- Components subscribe with selectors to avoid full-tree re-renders.

## 6) Best-practices checklist

- [x] Keep socket URL in environment variable and fail fast if missing.
- [x] Strongly type client/server socket events.
- [x] Separate emit/listen functions from components.
- [x] Return explicit listener cleanup function.
- [x] Handle connection status (`connecting`, `connected`, `disconnected`, `error`).
- [x] De-duplicate messages on insert (`id` based).
- [x] Keep reconnection config explicit.
- [ ] Add auth token handshake and refresh strategy.
- [ ] Add telemetry (connection retries, dropped events, listener counts).
- [ ] Add runtime schema validation for inbound payloads.

## 7) Performance notes

- Subscribe to store slices with selectors (`useChatStore((s) => s.messagesByGroup[groupId] ?? [])`).
- Keep ephemeral input state local to component; keep server-shared state global.
- Memoize derived UI lists (typing users).
- Debounce/throttle typing emits to reduce noisy traffic.
- Code split feature pages with lazy loading when route count grows.

## 8) Migration plan (incremental)

1. Extract socket singleton to `shared/socket/socketClient.ts`.
2. Move chat events to `chatSocketService.ts` with typed handlers.
3. Introduce feature store (`chatStore.ts`) and migrate one event (`message`).
4. Replace direct component emits/listens with `useChatSocket()`.
5. Repeat per event group: typing, group membership, moderation, notifications.
6. Move non-chat concerns (auth/user/notifications) into their own feature modules.

## 9) Included reference implementation in this repo

- Socket singleton + reconnect options: `src/shared/socket/socketClient.ts`
- Chat event registration + emit wrappers: `src/features/chat/services/chatSocketService.ts`
- Zustand store for message/typing/connection state: `src/features/chat/store/chatStore.ts`
- Reusable hook for lifecycle orchestration: `src/features/chat/hooks/useChatSocket.ts`
- Presentational-ish component consuming hook/store: `src/features/chat/components/ChatRoom.tsx`
