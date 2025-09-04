import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  created_at: string;
  updated_at?: string;
  message_type: string;
  is_edited?: boolean;
  is_deleted?: boolean;
}

interface ChatRoom {
  id: string;
  name: string;
  property_id: string;
  property_title: string;
  participants: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

interface Property {
  id: string;
  title: string;
  agent_name?: string;
  agent_rating?: number;
  agent_phone?: string;
  agent_email?: string;
}

interface ChatPageProps {
  apiUrl: string;
}

const ChatPage: React.FC<ChatPageProps> = ({ apiUrl }) => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callType, setCallType] = useState<'video' | 'audio' | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showMessageMenu, setShowMessageMenu] = useState<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0 && chatRoom) {
      const chatData = {
        roomId: chatRoom.id,
        messages: messages,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(`chat_${chatRoom.id}`, JSON.stringify(chatData));
    }
  }, [messages, chatRoom]);

  // Load messages from localStorage on component mount
  useEffect(() => {
    if (chatRoom) {
      const savedChatData = localStorage.getItem(`chat_${chatRoom.id}`);
      if (savedChatData) {
        try {
          const chatData = JSON.parse(savedChatData);
          if (chatData.messages && chatData.messages.length > 0) {
            // Only load if the saved data is recent (within 24 hours)
            const lastUpdated = new Date(chatData.lastUpdated);
            const now = new Date();
            const hoursDiff = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
            
            if (hoursDiff < 24) {
              setMessages(chatData.messages);
            } else {
              // Clear old data
              localStorage.removeItem(`chat_${chatRoom.id}`);
            }
          }
        } catch (err) {
          console.error('Error loading saved chat data:', err);
          localStorage.removeItem(`chat_${chatRoom.id}`);
        }
      }
    }
  }, [chatRoom]);

  // Format timestamp to relative time
  const formatTime = (timestamp: string) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - messageTime.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return messageTime.toLocaleDateString();
  };

  // Handle typing indicator
  const handleTyping = () => {
    setIsTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  // Filter messages based on search
  const filteredMessages = messages.filter(message =>
    message.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fetchPropertyDetails = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const response = await axios.get(
        `${apiUrl}/api/v1/properties/${propertyId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setProperty(response.data);
    } catch (err) {
      console.error('Error fetching property details:', err);
    }
  }, [propertyId, apiUrl]);


  const fetchMessages = useCallback(async (roomId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${apiUrl}/api/v1/chat/rooms/${roomId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessages(response.data.reverse()); // Reverse to show oldest first
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      
      // Handle authentication errors
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
        // Clear invalid token and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Update global auth state
        if ((window as any).updateAuthState) {
          (window as any).updateAuthState();
        }
        navigate('/login');
        return;
      }
    }
  }, [apiUrl, navigate]);

  const createChatRoom = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      
      // First, get the property details to find the owner
      const propertyResponse = await axios.get(
        `${apiUrl}/api/v1/properties/${propertyId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const property = propertyResponse.data;
      const ownerId = property.owner_id;
      
      // Create chat room between buyer and property owner (agent)
      const response = await axios.post(
        `${apiUrl}/api/v1/chat/rooms`,
        {
          name: `Chat with ${property.agent_name || 'Property Owner'}`,
          room_type: 'property',
          property_id: propertyId,
          participant_ids: [ownerId] // Add property owner (agent) as participant
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setChatRoom(response.data);
      fetchMessages(response.data.id);
    } catch (err: any) {
      console.error('Error creating chat room:', err);
      
      // Handle authentication errors
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
        // Clear invalid token and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Update global auth state
        if ((window as any).updateAuthState) {
          (window as any).updateAuthState();
        }
        navigate('/login');
        return;
      }
      
      setError('Failed to create chat room. Please try again.');
    }
  }, [propertyId, apiUrl, fetchMessages, navigate]);

  const fetchChatRoom = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // First, try to get existing chat room for this property
      const response = await axios.get(`${apiUrl}/api/v1/chat/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Find existing chat room for this property
      const existingRoom = response.data.find((room: any) => room.property_id === propertyId);
      
      if (existingRoom) {
        setChatRoom(existingRoom);
        fetchMessages(existingRoom.id);
      } else {
        // Create a new chat room if none exists
        await createChatRoom();
      }
    } catch (err: any) {
      console.error('Error fetching chat room:', err);
      
      // Handle authentication errors
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
        // Clear invalid token and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Update global auth state
        if ((window as any).updateAuthState) {
          (window as any).updateAuthState();
        }
        navigate('/login');
        return;
      }
      
      setError('Failed to load chat room. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [propertyId, apiUrl, navigate, createChatRoom, fetchMessages]);

  useEffect(() => {
    if (propertyId) {
      fetchPropertyDetails();
      fetchChatRoom();
    }
  }, [propertyId, fetchPropertyDetails, fetchChatRoom]);

  // Close message menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMessageMenu) {
        setShowMessageMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMessageMenu]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatRoom || sendingMessage) return;

    setSendingMessage(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    // Optimistically add message to UI
    const tempMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      sender_id: 'current-user',
      sender_name: 'You',
      created_at: new Date().toISOString(),
      message_type: 'text'
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${apiUrl}/api/v1/chat/rooms/${chatRoom.id}/messages`,
        {
          content: messageContent,
          message_type: 'text'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Replace temp message with real message
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessage.id ? response.data : msg
      ));
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      setNewMessage(messageContent); // Restore message content
    } finally {
      setSendingMessage(false);
    }
  };

  const editMessage = async (messageId: string, newContent: string) => {
    if (!chatRoom || !newContent.trim()) return;

    // If this is a temporary message ID, wait for it to be replaced with real ID
    if (messageId.startsWith('temp-')) {
      // Wait a bit for the message to be sent and get real ID
      setTimeout(() => {
        const realMessage = messages.find(msg => 
          msg.content === newContent.trim() && 
          !msg.id.startsWith('temp-') && 
          msg.sender_name === 'You'
        );
        
        if (realMessage) {
          editMessage(realMessage.id, newContent);
        } else {
          setError('Message is still being sent. Please try again in a moment.');
          setEditingMessage(null);
          setEditContent('');
        }
      }, 1000);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${apiUrl}/api/v1/chat/rooms/${chatRoom.id}/messages/${messageId}`,
        { content: newContent.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update the message in the local state
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? response.data : msg
      ));

      setEditingMessage(null);
      setEditContent('');
    } catch (err) {
      console.error('Error editing message:', err);
      setError('Failed to edit message');
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!chatRoom) return;

    // If this is a temporary message ID, just remove it from local state
    if (messageId.startsWith('temp-')) {
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      setShowMessageMenu(null);
      return;
    }

    if (!window.confirm('Are you sure you want to delete this message?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${apiUrl}/api/v1/chat/rooms/${chatRoom.id}/messages/${messageId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update the message in the local state
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, content: 'This message was deleted', is_deleted: true } : msg
      ));

      setShowMessageMenu(null);
    } catch (err) {
      console.error('Error deleting message:', err);
      setError('Failed to delete message');
    }
  };

  const startEdit = (message: ChatMessage) => {
    setEditingMessage(message.id);
    setEditContent(message.content);
    setShowMessageMenu(null);
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setEditContent('');
  };


  const startCall = async (type: 'video' | 'audio') => {
    try {
      const constraints = {
        video: type === 'video',
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setIsCallActive(true);
      setCallType(type);
      setIsVideoEnabled(type === 'video');

      // In a real implementation, you would establish WebRTC connection here
      // For now, we'll just show the local video/audio
      console.log('Call started:', type);
    } catch (error) {
      console.error('Error starting call:', error);
      alert('Error accessing camera/microphone. Please check permissions.');
    }
  };

  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setIsCallActive(false);
    setCallType(null);
    setIsMuted(false);
    setIsVideoEnabled(true);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
        <div className="max-w-4xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center py-2 sm:py-3 md:py-4">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/dashboard?tab=chats')}
                className="ml-2 mr-3 sm:mr-4 text-white hover:text-blue-200 transition-colors"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center space-x-2 sm:space-x-3 py-1 sm:py-2">
                {property?.agent_name && (
                  <div className="w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-12 lg:h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-xs sm:text-sm md:text-base lg:text-lg font-bold">
                      {property.agent_name.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                                     <h1 className="text-sm sm:text-base md:text-lg font-bold text-white truncate">
                     {property?.agent_name || 'Agent Chat'}
                   </h1>
                                     <p className="text-blue-100 text-xs sm:text-sm truncate hidden sm:block">
                     {chatRoom?.property_title || `Property ID: ${propertyId}`}
                   </p>
                  {property?.agent_rating && (
                    <div className="flex items-center bg-white bg-opacity-20 px-2 py-1 rounded-full mt-1 w-fit">
                      <span className="text-yellow-300 text-xs sm:text-sm">⭐</span>
                      <span className="text-white text-xs sm:text-sm ml-1 font-medium">
                        {Number(property.agent_rating).toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex space-x-2 sm:space-x-3 mr-2">
              {!isCallActive && (
                <>
                                     <button
                     onClick={() => startCall('video')}
                     className="bg-white bg-opacity-20 hover:bg-opacity-30 active:bg-opacity-40 text-white px-3 py-2 rounded-lg text-xs flex items-center justify-center min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 space-x-1 transition-all duration-200 backdrop-blur-sm touch-manipulation"
                   >
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                     </svg>
                     <span className="font-medium hidden sm:inline">Video</span>
                   </button>
                   <button
                     onClick={() => startCall('audio')}
                     className="bg-white bg-opacity-20 hover:bg-opacity-30 active:bg-opacity-40 text-white px-3 py-2 rounded-lg text-xs flex items-center justify-center min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 space-x-1 transition-all duration-200 backdrop-blur-sm touch-manipulation"
                   >
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                     </svg>
                     <span className="font-medium hidden sm:inline">Audio</span>
                   </button>
                </>
              )}
                             <button
                 onClick={() => navigate('/dashboard?tab=chats')}
                 className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 shadow-lg hidden sm:flex"
               >
                 Close
               </button>
            </div>
          </div>
        </div>
      </div>

      {/* Video Call Interface */}
      {isCallActive && (
        <div className="fixed inset-0 bg-black z-50">
          <div className="flex h-full">
            {/* Remote Video */}
            <div className="flex-1 relative">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded">
                {callType === 'video' ? 'Video Call' : 'Audio Call'} - Property Owner
              </div>
            </div>

            {/* Local Video */}
            <div className="absolute bottom-4 right-4 w-64 h-48 bg-gray-800 rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>

            {/* Call Controls */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
              <button
                onClick={toggleMute}
                className={`p-3 rounded-full ${isMuted ? 'bg-red-600' : 'bg-gray-600'} text-white hover:bg-opacity-80`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMuted ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  )}
                </svg>
              </button>

              {callType === 'video' && (
                <button
                  onClick={toggleVideo}
                  className={`p-3 rounded-full ${isVideoEnabled ? 'bg-gray-600' : 'bg-red-600'} text-white hover:bg-opacity-80`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              )}

              <button
                onClick={endCall}
                className="p-3 rounded-full bg-red-600 text-white hover:bg-red-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="max-w-5xl mx-auto px-1 sm:px-2 md:px-4 lg:px-8 py-1 sm:py-2">
        <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg sm:shadow-xl h-[calc(100vh-100px)] sm:h-[calc(100vh-120px)] md:h-[calc(100vh-140px)] flex flex-col border border-gray-200 overflow-hidden">
          {/* Search Bar */}
          {messages.length > 0 && (
            <div className="border-b border-gray-100 p-2 sm:p-3 md:p-4 bg-gray-50">
              <div className="relative max-w-xs sm:max-w-sm md:max-w-md mx-auto">
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-6 sm:pl-8 md:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 md:py-3 border-0 bg-white rounded-md sm:rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:shadow-md transition-all text-xs sm:text-sm md:text-base"
                />
                <svg className="absolute left-1.5 sm:left-2 md:left-3 top-1.5 sm:top-2 md:top-2.5 w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 lg:p-6 pt-4 sm:pt-6 md:pt-8 space-y-2 sm:space-y-3 md:space-y-4 lg:space-y-6">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-4 sm:py-6 md:py-8">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 mx-auto mb-2 sm:mb-3 md:mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="mb-1 sm:mb-2 text-xs sm:text-sm md:text-base">No messages yet. Start the conversation!</p>
                {property?.agent_name && (
                  <div className="text-xs sm:text-sm text-blue-600">
                    <p>You're chatting with <span className="font-medium">{property.agent_name}</span></p>
                    {property.agent_rating && (
                      <p className="text-xs text-gray-500 mt-1">
                        Agent Rating: ⭐ {Number(property.agent_rating).toFixed(1)}/5.0
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                {filteredMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_name === 'You' ? 'justify-end' : 'justify-start'} mb-2 sm:mb-3 md:mb-4 lg:mb-6`}
                  >
                    <div className={`max-w-[85%] sm:max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg ${message.sender_name === 'You' ? 'order-2' : 'order-1'}`}>
                      {message.sender_name !== 'You' && (
                        <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3 mb-1.5 sm:mb-2 md:mb-3">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg ring-1 sm:ring-2 ring-white">
                            <span className="text-white text-xs sm:text-sm md:text-base lg:text-lg font-bold">
                              {message.sender_name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs sm:text-sm font-semibold text-gray-800">{message.sender_name}</span>
                            <p className="text-xs text-gray-500">{formatTime(message.updated_at || message.created_at)}</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Message Content */}
                      <div className="relative group">
                        {editingMessage === message.id ? (
                          // Edit Mode
                          <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 rounded-lg sm:rounded-xl md:rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg sm:shadow-xl">
                            <input
                              type="text"
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  editMessage(message.id, editContent);
                                } else if (e.key === 'Escape') {
                                  cancelEdit();
                                }
                              }}
                              className="w-full bg-transparent text-white placeholder-blue-200 focus:outline-none text-xs sm:text-sm"
                              placeholder="Edit message..."
                              autoFocus
                            />
                            <div className="flex items-center justify-end mt-2 sm:mt-3 space-x-1.5 sm:space-x-2">
                              <button
                                onClick={() => editMessage(message.id, editContent)}
                                className="text-xs bg-blue-700 hover:bg-blue-800 px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-md sm:rounded-lg font-medium transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="text-xs bg-gray-600 hover:bg-gray-700 px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-md sm:rounded-lg font-medium transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          // Normal Message
                          <div className="relative">
                            <div
                              className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 rounded-lg sm:rounded-xl md:rounded-2xl shadow-sm sm:shadow-md ${
                                message.sender_name === 'You'
                                  ? 'bg-blue-500 text-white rounded-br-lg'
                                  : 'bg-white text-gray-800 rounded-bl-lg border border-gray-200 shadow-sm'
                              } ${message.id.startsWith('temp-') ? 'opacity-70' : ''} ${
                                message.is_deleted ? 'opacity-50 italic bg-gray-100' : ''
                              }`}
                            >
                              <p className="text-xs sm:text-sm md:text-base leading-relaxed break-words whitespace-pre-wrap">
                                {message.content}
                                {message.is_edited && (
                                  <span className="text-xs opacity-75 ml-2 font-medium">(edited)</span>
                                )}
                              </p>
                              {message.sender_name === 'You' && !message.is_deleted && (
                                <div className="flex items-center justify-end mt-3">
                                  <span className="text-xs opacity-75 mr-2">
                                    {formatTime(message.updated_at || message.created_at)}
                                  </span>
                                  <div className="flex items-center space-x-1">
                                    {message.id.startsWith('temp-') ? (
                                      <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse"></div>
                                    ) : (
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Message Actions for User's Messages */}
                            {message.sender_name === 'You' && !message.is_deleted && !editingMessage && (
                              <div className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                <div className="flex space-x-2 bg-white rounded-full p-1 shadow-lg border border-gray-200">
                                  <button
                                    onClick={() => startEdit(message)}
                                    className="bg-blue-500 hover:bg-blue-600 text-white p-2.5 rounded-full shadow-md transition-all duration-200 hover:scale-110"
                                    title="Edit message"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => deleteMessage(message.id)}
                                    className="bg-red-500 hover:bg-red-600 text-white p-2.5 rounded-full shadow-md transition-all duration-200 hover:scale-110"
                                    title="Delete message"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex justify-start mb-2 sm:mb-3 md:mb-4 lg:mb-6">
                    <div className="bg-white border border-gray-200 px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 rounded-lg sm:rounded-xl md:rounded-2xl rounded-bl-lg shadow-sm">
                      <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3">
                        <div className="flex space-x-0.5 sm:space-x-1">
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-bounce"></div>
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                        <span className="text-xs sm:text-sm text-gray-600 font-medium">Agent is typing...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Auto-scroll anchor */}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Message Input */}
          <form onSubmit={sendMessage} className="border-t border-gray-100 p-2 sm:p-3 md:p-4 lg:p-6 bg-white">
            <div className="flex items-end space-x-1.5 sm:space-x-2 md:space-x-3 lg:space-x-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(e);
                    }
                  }}
                  placeholder="Type your message..."
                  className="w-full border-2 border-gray-200 rounded-lg sm:rounded-xl md:rounded-2xl px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 pr-10 sm:pr-12 md:pr-16 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white shadow-sm focus:shadow-md text-xs sm:text-sm md:text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="absolute right-2 sm:right-3 md:right-5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors p-1 rounded-full hover:bg-gray-100"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
              <button
                type="submit"
                disabled={!newMessage.trim() || sendingMessage}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-3 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-3 md:py-4 rounded-lg sm:rounded-xl md:rounded-2xl font-semibold transition-all duration-200 flex items-center space-x-1 sm:space-x-2 shadow-lg hover:shadow-xl disabled:shadow-none hover:scale-105 disabled:hover:scale-100 text-xs sm:text-sm md:text-base min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0"
              >
                {sendingMessage ? (
                  <>
                    <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="hidden sm:inline">Sending...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span className="hidden sm:inline">Send</span>
                  </>
                )}
              </button>
            </div>
            
            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="mt-2 sm:mt-3 md:mt-4 p-2 sm:p-3 md:p-5 bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg sm:shadow-xl border border-gray-200">
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-1.5 sm:gap-2 md:gap-4">
                  {['😀', '😊', '😂', '😍', '🤔', '👍', '👎', '❤️', '🎉', '🔥', '💯', '👌', '🙏', '😢', '😡', '🤯'].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setNewMessage(prev => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="text-lg sm:text-xl md:text-2xl hover:bg-gray-100 rounded-md sm:rounded-lg md:rounded-xl p-1.5 sm:p-2 md:p-3 transition-all duration-200 hover:scale-110 sm:hover:scale-125 hover:shadow-md min-w-[32px] min-h-[32px] sm:min-w-0 sm:min-h-0"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
