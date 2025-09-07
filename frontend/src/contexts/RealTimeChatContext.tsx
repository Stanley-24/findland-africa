import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  message_type: string;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at?: string;
  is_read?: boolean;
  read_at?: string;
}

interface ChatRoom {
  id: string;
  name: string;
  room_type: string;
  property_id?: string;
  property_title?: string;
  property_location?: string;
  agent_name?: string;
  agent_rating?: number;
  agent_avatar?: string;
  agent_online?: boolean;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  last_message?: ChatMessage;
  message_count: number;
  participants?: Array<{
    id: string;
    user_id: string;
    role: string;
    is_active: boolean;
  }>;
}

interface TypingUser {
  user_id: string;
  user_name: string;
  room_id: string;
}

// interface UnreadCount {
//   room_id: string;
//   count: number;
// }

interface RealTimeChatContextType {
  // Chat rooms
  chatRooms: ChatRoom[];
  setChatRooms: (rooms: ChatRoom[]) => void;
  updateChatRoom: (roomId: string, updates: Partial<ChatRoom>) => void;
  
  // Messages
  messages: { [roomId: string]: ChatMessage[] };
  setMessages: (roomId: string, messages: ChatMessage[]) => void;
  addMessage: (roomId: string, message: ChatMessage) => void;
  loadCachedMessages: (roomId: string) => ChatMessage[];
  
  // Typing indicators
  typingUsers: { [roomId: string]: TypingUser[] };
  setTypingUser: (roomId: string, user: TypingUser | null) => void;
  
  // Unread counts
  unreadCounts: { [roomId: string]: number };
  setUnreadCount: (roomId: string, count: number) => void;
  incrementUnreadCount: (roomId: string) => void;
  clearUnreadCount: (roomId: string) => void;
  
  // WebSocket
  sendTypingIndicator: (roomId: string, isTyping: boolean) => void;
  isConnected: boolean;
}

const RealTimeChatContext = createContext<RealTimeChatContextType | undefined>(undefined);

export const useRealTimeChat = () => {
  const context = useContext(RealTimeChatContext);
  if (!context) {
    throw new Error('useRealTimeChat must be used within a RealTimeChatProvider');
  }
  return context;
};

interface RealTimeChatProviderProps {
  children: React.ReactNode;
  apiUrl: string;
  userId: string | null;
}

export const RealTimeChatProvider: React.FC<RealTimeChatProviderProps> = ({
  children,
  apiUrl,
  userId
}) => {
  const [chatRooms, setChatRoomsState] = useState<ChatRoom[]>([]);
  const [messages, setMessagesState] = useState<{ [roomId: string]: ChatMessage[] }>({});
  const [typingUsers, setTypingUsersState] = useState<{ [roomId: string]: TypingUser[] }>({});
  const [unreadCounts, setUnreadCountsState] = useState<{ [roomId: string]: number }>({});

  // WebSocket connection
  const { sendTypingIndicator, isConnected } = useWebSocket({
    apiUrl,
    userId,
    onMessage: useCallback((message: any) => {
      console.log('Real-time message received:', message);
      
      if (message.type === 'message') {
        const newMessage: ChatMessage = {
          id: message.data.id,
          room_id: message.data.room_id,
          sender_id: message.data.sender_id,
          sender_name: message.data.sender_name,
          content: message.data.content,
          message_type: message.data.message_type || 'text',
          is_edited: message.data.is_edited || false,
          is_deleted: message.data.is_deleted || false,
          created_at: message.data.created_at,
          updated_at: message.data.updated_at,
          is_read: message.data.is_read || false,
          read_at: message.data.read_at
        };
        
        // Add message to the room (append to end for newest at bottom)
        setMessagesState(prev => ({
          ...prev,
          [message.data.room_id]: [...(prev[message.data.room_id] || []), newMessage]
        }));
        
        // Update last message in chat room
        setChatRoomsState(prev => prev.map(room => 
          room.id === message.data.room_id 
            ? { ...room, last_message: newMessage, message_count: (room.message_count || 0) + 1 }
            : room
        ));
        
        // Increment unread count if not from current user
        if (message.data.sender_id !== userId) {
          setUnreadCountsState(prev => ({
            ...prev,
            [message.data.room_id]: (prev[message.data.room_id] || 0) + 1
          }));
        }
      } else if (message.type === 'room_created') {
        // Handle new room creation - add to chat rooms list
        console.log('Room created:', message.data);
        const newRoom: ChatRoom = {
          id: message.data.id,
          name: message.data.name,
          room_type: message.data.room_type || 'property',
          property_id: message.data.property_id,
          property_title: message.data.property_title,
          property_location: message.data.property_location,
          agent_name: message.data.agent_name,
          agent_rating: message.data.agent_rating,
          agent_avatar: message.data.agent_avatar,
          agent_online: message.data.agent_online,
          created_by: message.data.created_by,
          is_active: message.data.is_active,
          created_at: message.data.created_at,
          updated_at: message.data.updated_at,
          last_message: undefined,
          message_count: 0,
          participants: message.data.participants || []
        };
        
        setChatRoomsState(prev => {
          // Check if room already exists to avoid duplicates
          const exists = prev.some(room => room.id === newRoom.id);
          if (exists) {
            return prev;
          }
          return [...prev, newRoom];
        });
      } else if (message.type === 'room_deleted') {
        // Handle room deletion - remove from chat rooms list
        console.log('Room deleted:', message.data.room_id);
        setChatRoomsState(prev => prev.filter(room => room.id !== message.data.room_id));
        
        // Clear messages for deleted room
        setMessagesState(prev => {
          const newMessages = { ...prev };
          delete newMessages[message.data.room_id];
          return newMessages;
        });
        
        // Clear unread counts for deleted room
        setUnreadCountsState(prev => {
          const newCounts = { ...prev };
          delete newCounts[message.data.room_id];
          return newCounts;
        });
        
        // Clear typing users for deleted room
        setTypingUsersState(prev => {
          const newTyping = { ...prev };
          delete newTyping[message.data.room_id];
          return newTyping;
        });
      } else if (message.type === 'messages_read') {
        // Handle read receipts - mark messages as read
        console.log('Messages marked as read:', message.data);
        const { room_id, message_ids, read_by, read_at } = message.data;
        
        setMessagesState(prev => {
          const roomMessages = prev[room_id] || [];
          const updatedMessages = roomMessages.map(msg => {
            if (message_ids.includes(msg.id) && msg.sender_id !== read_by) {
              return {
                ...msg,
                is_read: true,
                read_at: read_at
              };
            }
            return msg;
          });
          
          return {
            ...prev,
            [room_id]: updatedMessages
          };
        });
      }
    }, [userId]),
    
    onTyping: useCallback((data: any) => {
      console.log('Typing indicator received:', data);
      
      if (data.type === 'typing_start') {
        setTypingUsersState(prev => ({
          ...prev,
          [data.room_id]: [
            ...(prev[data.room_id] || []).filter(u => u.user_id !== data.user_id),
            {
              user_id: data.user_id,
              user_name: data.user_name,
              room_id: data.room_id
            }
          ]
        }));
      } else if (data.type === 'typing_stop') {
        setTypingUsersState(prev => ({
          ...prev,
          [data.room_id]: (prev[data.room_id] || []).filter(u => u.user_id !== data.user_id)
        }));
      }
    }, [])
  });

  // Chat room management
  const setChatRooms = useCallback((rooms: ChatRoom[]) => {
    setChatRoomsState(rooms);
  }, []);

  const updateChatRoom = useCallback((roomId: string, updates: Partial<ChatRoom>) => {
    setChatRoomsState(prev => prev.map(room => 
      room.id === roomId ? { ...room, ...updates } : room
    ));
  }, []);

  // Message management with caching
  const setMessages = useCallback((roomId: string, messages: ChatMessage[]) => {
    // Sort messages by created_at to ensure proper order (oldest first, newest at bottom)
    const sortedMessages = [...messages].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    setMessagesState(prev => ({
      ...prev,
      [roomId]: sortedMessages
    }));
    
    // Cache messages in localStorage for faster loading
    try {
      localStorage.setItem(`chat_messages_${roomId}`, JSON.stringify(sortedMessages));
    } catch (error) {
      console.error('Error caching messages:', error);
    }
  }, []);

  const addMessage = useCallback((roomId: string, message: ChatMessage) => {
    setMessagesState(prev => {
      const newMessages = [...(prev[roomId] || []), message];
      
      // Cache updated messages
      try {
        localStorage.setItem(`chat_messages_${roomId}`, JSON.stringify(newMessages));
      } catch (error) {
        console.error('Error caching messages:', error);
      }
      
      return {
        ...prev,
        [roomId]: newMessages
      };
    });
  }, []);

  // Typing indicator management
  const setTypingUser = useCallback((roomId: string, user: TypingUser | null) => {
    if (!user) {
      setTypingUsersState(prev => ({
        ...prev,
        [roomId]: []
      }));
    } else {
      setTypingUsersState(prev => ({
        ...prev,
        [roomId]: [
          ...(prev[roomId] || []).filter(u => u.user_id !== user.user_id),
          user
        ]
      }));
    }
  }, []);

  // Unread count management
  const setUnreadCount = useCallback((roomId: string, count: number) => {
    setUnreadCountsState(prev => ({
      ...prev,
      [roomId]: count
    }));
  }, []);

  const incrementUnreadCount = useCallback((roomId: string) => {
    setUnreadCountsState(prev => ({
      ...prev,
      [roomId]: (prev[roomId] || 0) + 1
    }));
  }, []);

  const clearUnreadCount = useCallback((roomId: string) => {
    setUnreadCountsState(prev => ({
      ...prev,
      [roomId]: 0
    }));
  }, []);

  // Load cached messages
  const loadCachedMessages = useCallback((roomId: string): ChatMessage[] => {
    try {
      const cached = localStorage.getItem(`chat_messages_${roomId}`);
      if (cached) {
        const messages = JSON.parse(cached);
        // Sort messages by created_at to ensure proper order
        return messages.sort((a: ChatMessage, b: ChatMessage) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }
    } catch (error) {
      console.error('Error loading cached messages:', error);
    }
    return [];
  }, []);

  // sendTypingIndicator is now provided by the WebSocket hook

  // Clear typing indicators when user leaves
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Send typing stop for all rooms
      Object.keys(typingUsers).forEach(roomId => {
        sendTypingIndicator(roomId, false);
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [typingUsers, sendTypingIndicator]);

  const value: RealTimeChatContextType = {
    chatRooms,
    setChatRooms,
    updateChatRoom,
    messages,
    setMessages,
    addMessage,
    loadCachedMessages,
    typingUsers,
    setTypingUser,
    unreadCounts,
    setUnreadCount,
    incrementUnreadCount,
    clearUnreadCount,
    sendTypingIndicator,
    isConnected
  };

  return (
    <RealTimeChatContext.Provider value={value}>
      {children}
    </RealTimeChatContext.Provider>
  );
};
