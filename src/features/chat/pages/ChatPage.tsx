import { ChatRoom } from '../components/ChatRoom';

interface ChatPageProps {
  groupId: string;
}

export function ChatPage({ groupId }: ChatPageProps) {
  return <ChatRoom groupId={groupId} />;
}
