import { useMemo, useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { useChatSocket } from '../hooks/useChatSocket';

interface ChatRoomProps {
  groupId: string;
}

export function ChatRoom({ groupId }: ChatRoomProps) {
  const [draft, setDraft] = useState('');
  const { sendMessage, startTyping, stopTyping } = useChatSocket(groupId);

  const messages = useChatStore((state) => state.messagesByGroup[groupId] ?? []);
  const typingUsers = useChatStore((state) => state.typingByGroup[groupId] ?? {});
  const status = useChatStore((state) => state.connectionStatus);
  const error = useChatStore((state) => state.errorMessage);

  const typingPreview = useMemo(() => Object.values(typingUsers), [typingUsers]);

  return (
    <section>
      <header>
        <h2>Group: {groupId}</h2>
        <small>Socket status: {status}</small>
      </header>

      {error ? <p role="alert">{error}</p> : null}

      <ul>
        {messages.map((message) => (
          <li key={message.id}>
            <strong>{message.username}:</strong> {message.text}
          </li>
        ))}
      </ul>

      {typingPreview.length > 0 ? <p>{typingPreview.join(', ')} typing…</p> : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft.trim()) return;
          sendMessage(draft);
          stopTyping();
          setDraft('');
        }}
      >
        <input
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            startTyping();
          }}
          onBlur={stopTyping}
          placeholder="Type your message"
        />
        <button type="submit">Send</button>
      </form>
    </section>
  );
}
