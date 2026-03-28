export interface User {
  id: string; // socketId for transport
  userId: string; // permanent userId
  username: string;
  isOnline: boolean;
}

export interface Group {
  id: string;
  name: string;
  adminUserId: string; // permanent userId
  members: User[];
}

export interface Message {
  id: string;
  username: string;
  text: string;
  timestamp: number;
  type: 'chat' | 'system';
  groupId: string;
}

export interface ServerToClientEvents {
  message: (message: Message) => void;
  users: (users: User[]) => void;
  error: (message: string) => void;
  authSuccess: (username: string, userId: string) => void;
  groupCreated: (group: Group) => void;
  groupJoined: (group: Group, history: Message[]) => void;
  userKicked: (groupId: string) => void;
  groupsList: (groups: { id: string; name: string }[]) => void;
  joinedGroupsList: (groups: { id: string; name: string }[]) => void;
  groupDeleted: (groupId: string) => void;
  typing: (userId: string, username: string, groupId: string) => void;
  stopTyping: (userId: string, groupId: string) => void;
}

export interface ClientToServerEvents {
  register: (username: string, pass: string) => void;
  login: (username: string, pass: string) => void;
  autoLogin: (username: string) => void;
  createGroup: (groupName: string) => void;
  joinGroup: (groupId: string) => void;
  message: (groupId: string, text: string) => void;
  kickUser: (groupId: string, userId: string) => void;
  deleteGroup: (groupId: string) => void;
  leaveGroup: (groupId: string) => void;
  typing: (groupId: string) => void;
  stopTyping: (groupId: string) => void;
}
