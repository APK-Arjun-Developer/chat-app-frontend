import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { Send, LogOut, MessageSquare, Users, Plus, Shield, Trash2, ChevronLeft, Eye, EyeOff, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Message, User, Group } from './types';

export default function App() {
  const [username, setUsername] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentSocketId, setCurrentSocketId] = useState<string | null>(null);
  const [inputUsername, setInputUsername] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [availableGroups, setAvailableGroups] = useState<{ id: string; name: string }[]>([]);
  const [joinedGroups, setJoinedGroups] = useState<{ id: string; name: string }[]>([]);
  const [isJoinedGroupsOpen, setIsJoinedGroupsOpen] = useState(true);
  const [isAvailableGroupsOpen, setIsAvailableGroupsOpen] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isDeleteGroupModalOpen, setIsDeleteGroupModalOpen] = useState(false);
  const [isLeaveGroupModalOpen, setIsLeaveGroupModalOpen] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const currentGroupRef = useRef<Group | null>(null);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState<{[userId: string]: string}>({});
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [error, setError] = useState('');
  const [view, setView] = useState<'lobby' | 'chat'>('lobby');
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    currentGroupRef.current = currentGroup;
  }, [currentGroup]);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL);
    socketRef.current = socket;

    const savedUsername = localStorage.getItem('chat_username');
    if (savedUsername) {
      socket.emit('autoLogin', savedUsername);
    }

    socket.on('connect', () => {
      setCurrentSocketId(socket.id);
    });

    socket.on('message', (message: Message) => {
      setMessages((prev) => {
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    socket.on('users', (userList: User[]) => {
      // Deduplicate by userId to prevent "double admin" or ghosting users
      const uniqueUsers = Array.from(new Map(userList.map(u => [u.userId, u])).values());
      setUsers(uniqueUsers);
    });

    socket.on('authSuccess', (name: string, userId: string) => {
      setUsername(name);
      setCurrentUserId(userId);
      setIsJoined(true);
      setError('');
      localStorage.setItem('chat_username', name);
      
      // Check for groupId in URL after joining
      const urlParams = new URLSearchParams(window.location.search);
      const groupId = urlParams.get('groupId');
      if (groupId) {
        socket.emit('joinGroup', groupId);
      }
    });

    socket.on('groupsList', (list) => {
      const uniqueGroups = Array.from(new Map(list.map((g: any) => [g.id, g])).values()) as { id: string; name: string }[];
      setAvailableGroups(uniqueGroups);
    });

    socket.on('joinedGroupsList', (list) => {
      const uniqueGroups = Array.from(new Map(list.map((g: any) => [g.id, g])).values()) as { id: string; name: string }[];
      setJoinedGroups(uniqueGroups);
    });

    socket.on('groupJoined', (group: Group, history: Message[]) => {
      setCurrentGroup(group);
      setTypingUsers({});
      // Ensure unique messages in history
      const uniqueHistory = Array.from(new Map(history.map(m => [m.id, m])).values());
      setMessages(uniqueHistory);
      // Ensure unique users in group members by userId
      const uniqueMembers = Array.from(new Map(group.members.map(u => [u.userId, u])).values());
      setUsers(uniqueMembers);
      setView('chat');
      
      // Update URL without reloading
      const url = new URL(window.location.href);
      url.searchParams.set('groupId', group.id);
      window.history.pushState({}, '', url);
    });

    socket.on('groupDeleted', (groupId) => {
      const currentGroupId = currentGroupRef.current?.id;
      if (currentGroupId === groupId || (new URLSearchParams(window.location.search)).get('groupId') === groupId) {
        alert('This group has been deleted by the admin.');
        setView('lobby');
        setCurrentGroup(null);
        setMessages([]);
        setUsers([]);
        setTypingUsers({});
        
        const url = new URL(window.location.href);
        url.searchParams.delete('groupId');
        window.history.pushState({}, '', url);
      }
    });

    socket.on('userKicked', (groupId) => {
      const currentGroupId = currentGroupRef.current?.id;
      if (currentGroupId === groupId) {
        alert('You have been removed from the group by the admin.');
        setView('lobby');
        setCurrentGroup(null);
        setMessages([]);
        setUsers([]);
        setTypingUsers({});
        
        const url = new URL(window.location.href);
        url.searchParams.delete('groupId');
        window.history.pushState({}, '', url);
      }
    });

    socket.on('typing', (userId, username, groupId) => {
      if (currentGroupRef.current?.id === groupId) {
        setTypingUsers((prev) => ({ ...prev, [userId]: username }));
      }
    });

    socket.on('stopTyping', (userId, groupId) => {
      if (currentGroupRef.current?.id === groupId) {
        setTypingUsers((prev) => {
          const newState = { ...prev };
          delete newState[userId];
          return newState;
        });
      }
    });

    socket.on('error', (msg: string) => {
      setError(msg);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUsername.trim() && inputPassword.trim()) {
      if (authMode === 'login') {
        socketRef.current?.emit('login', inputUsername.trim(), inputPassword.trim());
      } else {
        socketRef.current?.emit('register', inputUsername.trim(), inputPassword.trim());
      }
    } else {
      setError('Please fill in all fields');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('chat_username');
    setUsername('');
    setIsJoined(false);
    setView('lobby');
    setCurrentGroup(null);
    setMessages([]);
    setUsers([]);
    setError('');
    setIsLogoutModalOpen(false);
    
    const url = new URL(window.location.href);
    url.searchParams.delete('groupId');
    window.history.pushState({}, '', url);
  };

  const handleDeleteGroup = () => {
    if (currentGroup) {
      socketRef.current?.emit('deleteGroup', currentGroup.id);
      setIsDeleteGroupModalOpen(false);
    }
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (groupNameInput.trim()) {
      socketRef.current?.emit('createGroup', groupNameInput.trim());
      setGroupNameInput('');
      setIsCreateModalOpen(false);
      setError('');
    } else {
      setError('Group name is required');
    }
  };

  const handleJoinGroup = (groupId: string) => {
    socketRef.current?.emit('joinGroup', groupId);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && currentGroup) {
      socketRef.current?.emit('message', currentGroup.id, inputText.trim());
      setInputText('');
      
      // Stop typing on send
      if (isTyping) {
        setIsTyping(false);
        socketRef.current?.emit('stopTyping', currentGroup.id);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputText(text);

    if (!currentGroup) return;

    if (!isTyping && text.trim().length > 0) {
      setIsTyping(true);
      socketRef.current?.emit('typing', currentGroup.id);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        socketRef.current?.emit('stopTyping', currentGroup.id);
      }
    }, 3000);

    if (text.trim().length === 0 && isTyping) {
      setIsTyping(false);
      socketRef.current?.emit('stopTyping', currentGroup.id);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleKickUser = (userId: string) => {
    if (currentGroup) {
      socketRef.current?.emit('kickUser', currentGroup.id, userId);
    }
  };

  const copyInviteLink = () => {
    if (currentGroup) {
      const link = `${window.location.origin}${window.location.pathname}?groupId=${currentGroup.id}`;
      navigator.clipboard.writeText(link);
      alert('Invite link copied to clipboard!');
    }
  };

  const leaveGroup = () => {
    if (currentGroup) {
      socketRef.current?.emit('leaveGroup', currentGroup.id);
    }
    setIsLeaveGroupModalOpen(false);
    setView('lobby');
    setCurrentGroup(null);
    setMessages([]);
    setUsers([]);
    setTypingUsers({});
    const url = new URL(window.location.href);
    url.searchParams.delete('groupId');
    window.history.pushState({}, '', url);
  };

  const backToLobby = () => {
    setView('lobby');
    setCurrentGroup(null);
    setMessages([]);
    setUsers([]);
    setTypingUsers({});
    const url = new URL(window.location.href);
    url.searchParams.delete('groupId');
    window.history.pushState({}, '', url);
  };

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-300">
      <AnimatePresence mode="wait">
        {!isJoined ? (
          <motion.div 
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-orange-500/10 rounded-xl">
                  <MessageSquare className="w-6 h-6 text-orange-500" />
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
                </h1>
              </div>

              <form onSubmit={handleAuth} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={inputUsername}
                      onChange={(e) => setInputUsername(e.target.value)}
                      placeholder="e.g. alex_dev"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                      autoFocus
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={inputPassword}
                        onChange={(e) => setInputPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {error && (
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-red-400 text-sm"
                    >
                      {error}
                    </motion.p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98]"
                >
                  {authMode === 'login' ? 'Login' : 'Register'}
                </button>

                <p className="text-center text-sm text-zinc-500">
                  {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode(authMode === 'login' ? 'register' : 'login');
                      setError('');
                    }}
                    className="text-orange-500 font-semibold hover:underline"
                  >
                    {authMode === 'login' ? 'Register' : 'Login'}
                  </button>
                </p>
              </form>
            </motion.div>
          </motion.div>
        ) : view === 'lobby' ? (
          <motion.div 
            key="lobby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen bg-zinc-950 p-4 md:p-8"
          >
        <div className="max-w-4xl mx-auto space-y-8">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <MessageSquare className="w-6 h-6 text-orange-500" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Chat Lobby</h1>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Create Group
              </button>
              <div className="flex items-center gap-3 bg-zinc-900 p-2 pl-4 rounded-xl border border-zinc-800">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{username}</span>
                <button onClick={() => setIsLogoutModalOpen(true)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors" title="Logout">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </header>

          <div className="grid gap-8">
            {/* Joined Groups */}
            <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <button 
                onClick={() => setIsJoinedGroupsOpen(!isJoinedGroupsOpen)}
                className="w-full flex items-center justify-between p-6 hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-orange-500" />
                  <h2 className="text-lg font-bold text-white tracking-tight">Joined Groups</h2>
                </div>
                {isJoinedGroupsOpen ? <ChevronUp className="w-5 h-5 text-zinc-500" /> : <ChevronDown className="w-5 h-5 text-zinc-500" />}
              </button>
              
              <AnimatePresence>
                {isJoinedGroupsOpen && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 pt-0 space-y-2">
                      {joinedGroups.length === 0 ? (
                        <p className="text-sm text-zinc-600 italic text-center py-4">You haven't joined any groups yet.</p>
                      ) : (
                        <div className="grid sm:grid-cols-2 gap-3">
                          {joinedGroups.map((g) => (
                            <button
                              key={g.id}
                              onClick={() => handleJoinGroup(g.id)}
                              className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 hover:border-orange-500/50 rounded-xl transition-all group"
                            >
                              <span className="font-medium text-zinc-300 group-hover:text-white">{g.name}</span>
                              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Open</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Available Groups */}
            <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <button 
                onClick={() => setIsAvailableGroupsOpen(!isAvailableGroupsOpen)}
                className="w-full flex items-center justify-between p-6 hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-500" />
                  <h2 className="text-lg font-bold text-white tracking-tight">Available Groups</h2>
                </div>
                {isAvailableGroupsOpen ? <ChevronUp className="w-5 h-5 text-zinc-500" /> : <ChevronDown className="w-5 h-5 text-zinc-500" />}
              </button>

              <AnimatePresence>
                {isAvailableGroupsOpen && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 pt-0 space-y-2">
                      {availableGroups.length === 0 ? (
                        <p className="text-sm text-zinc-600 italic text-center py-4">No other groups available.</p>
                      ) : (
                        <div className="grid sm:grid-cols-2 gap-3">
                          {availableGroups.map((g) => (
                            <button
                              key={g.id}
                              onClick={() => handleJoinGroup(g.id)}
                              className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 hover:border-orange-500/50 rounded-xl transition-all group"
                            >
                              <span className="font-medium text-zinc-300 group-hover:text-white">{g.name}</span>
                              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Join</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          </div>
        </div>
          </motion.div>
        ) : (
          <motion.div 
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col md:flex-row font-sans text-zinc-300"
          >
      {/* Sidebar - Active Users & Admin Controls */}
      <div className="w-full md:w-80 bg-zinc-900 border-b md:border-b-0 md:border-r border-zinc-800 flex flex-col">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-500" />
            <h2 className="font-bold text-white tracking-tight">Group Members</h2>
          </div>
          <span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {users.length}
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {users.map((u) => (
            <div 
              key={u.userId}
              className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                u.username === username ? 'bg-orange-500/10 border border-orange-500/20' : 'hover:bg-zinc-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${u.isOnline ? 'bg-green-500' : 'bg-zinc-600'}`} />
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${u.userId === currentUserId ? 'text-orange-500' : 'text-zinc-400'}`}>
                      {u.username} {u.userId === currentUserId && '(You)'}
                    </span>
                    {typingUsers[u.userId] && (
                      <span className="text-[10px] text-orange-500 animate-pulse font-bold uppercase tracking-widest">Typing...</span>
                    )}
                  </div>
                  {currentGroup?.adminUserId === u.userId && (
                    <span className="text-[9px] font-bold text-orange-500/70 uppercase tracking-widest flex items-center gap-1">
                      <Shield className="w-2 h-2" /> Admin
                    </span>
                  )}
                </div>
              </div>
              
              {/* Admin Kick Control */}
              {currentGroup?.adminUserId === currentUserId && u.userId !== currentUserId && (
                <button 
                  onClick={() => handleKickUser(u.userId)}
                  className="p-2 hover:bg-red-500/10 text-zinc-600 hover:text-red-400 rounded-lg transition-all"
                  title="Remove User"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-zinc-800 space-y-2">
          {currentGroup?.adminUserId === currentUserId && (
            <button 
              onClick={() => setIsDeleteGroupModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 p-3 text-sm font-medium text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Delete Group
            </button>
          )}
          <button 
            onClick={() => setIsLeaveGroupModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 p-3 text-sm font-medium text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
            Leave Group
          </button>
          <button 
            onClick={backToLobby}
            className="w-full flex items-center justify-center gap-2 p-3 text-sm font-medium text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-xl transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Lobby
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-[calc(100vh-200px)] md:h-screen">
        {/* Header */}
        <div className="p-6 bg-zinc-900/50 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-800 rounded-lg">
              <MessageSquare className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <h1 className="font-bold text-white tracking-tight">{currentGroup?.name}</h1>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{users.length} Members Online</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${
                  msg.type === 'system' 
                    ? 'items-center' 
                    : msg.username === username 
                      ? 'items-end' 
                      : 'items-start'
                }`}
              >
                {msg.type === 'system' ? (
                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest bg-zinc-900 px-3 py-1 rounded-full">
                    {msg.text}
                  </span>
                ) : (
                  <div className={`max-w-[80%] ${msg.username === username ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                      {users.find(u => u.username === msg.username)?.isOnline && (
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      )}
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        {msg.username}
                      </span>
                      <span className="text-[10px] text-zinc-700">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                      msg.username === username 
                        ? 'bg-orange-500 text-white rounded-tr-none' 
                        : 'bg-zinc-800 text-zinc-300 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 bg-zinc-900 border-t border-zinc-800">
          {/* Typing Indicator */}
          <div className="h-6 mb-2">
            <AnimatePresence>
              {Object.keys(typingUsers).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="flex items-center gap-2 text-[10px] font-bold text-orange-500/70 uppercase tracking-widest"
                >
                  <div className="flex gap-1">
                    <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0 }} className="w-1 h-1 bg-orange-500 rounded-full" />
                    <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-1 h-1 bg-orange-500 rounded-full" />
                    <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-1 h-1 bg-orange-500 rounded-full" />
                  </div>
                  <span>
                    {Object.values(typingUsers).join(', ')} {Object.keys(typingUsers).length === 1 ? 'is' : 'are'} typing...
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              placeholder="Type a message..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-orange-500 text-white p-3 rounded-xl transition-all active:scale-[0.95]"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl"
            >
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="absolute right-6 top-6 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-orange-500/10 rounded-xl">
                  <Plus className="w-6 h-6 text-orange-500" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Create Group</h2>
              </div>

              <form onSubmit={handleCreateGroup} className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={groupNameInput}
                    onChange={(e) => setGroupNameInput(e.target.value)}
                    placeholder="e.g. Developers Hub"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    autoFocus
                  />
                  {error && (
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-red-400 text-sm mt-2"
                    >
                      {error}
                    </motion.p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98]"
                >
                  Create Group
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLogoutModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLogoutModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl text-center"
            >
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-red-500/10 rounded-full">
                  <LogOut className="w-8 h-8 text-red-500" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Confirm Logout</h2>
              <p className="text-zinc-400 text-sm mb-8">Are you sure you want to log out of your account?</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsLogoutModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleLogout}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all"
                >
                  Logout
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLeaveGroupModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLeaveGroupModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl text-center"
            >
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-red-500/10 rounded-full">
                  <LogOut className="w-8 h-8 text-red-500" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Exit Group</h2>
              <p className="text-zinc-400 text-sm mb-8">
                Are you sure you want to leave <span className="text-white font-bold">"{currentGroup?.name}"</span>? 
                You will need to join again to see future messages.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsLeaveGroupModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={leaveGroup}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all"
                >
                  Leave
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDeleteGroupModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteGroupModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl text-center"
            >
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-red-500/10 rounded-full">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Delete Group</h2>
              <p className="text-zinc-400 text-sm mb-8">
                Are you sure you want to delete <span className="text-white font-bold">"{currentGroup?.name}"</span>? 
                This action cannot be undone and all messages will be lost.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeleteGroupModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteGroup}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
