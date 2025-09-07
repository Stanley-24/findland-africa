import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useRealTimeChat } from '../contexts/RealTimeChatContext';
import { useDataCache } from '../contexts/DataCacheContext';
import LoadingSpinner from './common/LoadingSpinner';

interface Property {
  id: string;
  title: string;
  location?: string;
  agent_name?: string;
  agent_rating?: number;
  agent_phone?: string;
  agent_email?: string;
}

interface ChatPageProps {
  apiUrl: string;
}

const EnhancedChatPage: React.FC<ChatPageProps> = ({ apiUrl }) => {
  const { chatRoomId } = useParams<{ chatRoomId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Real-time chat context
  const {
    messages,
    setMessages,
    addMessage,
    loadCachedMessages,
    typingUsers,
    clearUnreadCount,
    sendTypingIndicator,
    isConnected
  } = useRealTimeChat();
  
  // Data cache context
  const { removeMessageSentToProperty, hasSentMessageToProperty, markMessageSentToProperty, addChatRoomToCache } = useDataCache();
  
  // Get initial message and property info from navigation state
  const initialMessage = location.state?.initialMessage;
  // const propertyInfo = location.state?.propertyInfo; // TODO: Use for future enhancements
  
  // State
  const [chatRoom, setChatRoom] = useState<any>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState({ agent_online: false, current_user_online: false });
  
  // Call and media states
  const [isCallActive, setIsCallActive] = useState(false);
  const [callType, setCallType] = useState<'video' | 'audio' | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Refs for media
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const sentInitialMessageRef = useRef(false);
  
  // Get current user
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  
  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // TODO: Implement read receipts when backend endpoint is ready
  // const markMessagesAsRead = useCallback(async (roomId: string) => {
  //   try {
  //     const token = localStorage.getItem('token');
  //     if (!token || !roomId) return;
  //     await axios.post(
  //       `${apiUrl}/api/v1/fast/chat/rooms/${roomId}/mark-read`,
  //       {},
  //       { headers: { Authorization: `Bearer ${token}` } }
  //     );
  //     console.log('✅ [CHAT] Messages marked as read for room:', roomId);
  //   } catch (error) {
  //     console.error('Error marking messages as read:', error);
  //   }
  // }, [apiUrl]);
  
  // Load chat room data
  const loadChatRoom = useCallback(async () => {
    if (!chatRoomId || !token) return;
    
    try {
      setLoading(true);
      
      // Load cached messages first for faster display
      const cachedMessages = loadCachedMessages(chatRoomId);
      if (cachedMessages.length > 0) {
        setMessages(chatRoomId, cachedMessages);
      }
      
      // Load chat room details
      const roomResponse = await axios.get(`${apiUrl}/api/v1/fast/chat/rooms/${chatRoomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChatRoom(roomResponse.data);
      
      // Load fresh messages from server
      const messagesResponse = await axios.get(`${apiUrl}/api/v1/fast/chat/rooms/${chatRoomId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(chatRoomId, messagesResponse.data);
      
      // Load property details if available
      if (roomResponse.data.property_id) {
        try {
          const propertyResponse = await axios.get(`${apiUrl}/api/v1/fast/properties/${roomResponse.data.property_id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setProperty(propertyResponse.data);
        } catch (error) {
          console.error('Error loading property:', error);
        }
      }
      
      // Clear unread count for this room
      clearUnreadCount(chatRoomId);
      
      // Mark messages as read when chat is opened
      // markMessagesAsRead(chatRoomId); // Temporarily disabled until backend endpoint is implemented
      // updateMessagesAsRead(chatRoomId); // Temporarily disabled to prevent infinite loop
      
    } catch (error) {
      console.error('Error loading chat room:', error);
    } finally {
      setLoading(false);
    }
  }, [chatRoomId, token, apiUrl, setMessages, clearUnreadCount, loadCachedMessages]);
  
  // Load online status
  const loadOnlineStatus = useCallback(async () => {
    if (!chatRoomId || !token) return;
    
    try {
      const response = await axios.get(`${apiUrl}/api/v1/fast/chat/rooms/${chatRoomId}/online-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOnlineStatus(response.data);
    } catch (error) {
      console.error('Error loading online status:', error);
    }
  }, [chatRoomId, token, apiUrl]);
  
  // Send message
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !chatRoomId || !token || sendingMessage) return;
    
    const messageContent = newMessage.trim();
    setNewMessage('');
    setSendingMessage(true);
    
    // Stop typing indicator
    if (isTypingRef.current) {
      sendTypingIndicator(chatRoomId, false);
      isTypingRef.current = false;
    }
    
    try {
      const response = await axios.post(`${apiUrl}/api/v1/fast/chat/rooms/${chatRoomId}/messages`, {
        content: messageContent,
        message_type: 'text'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Add message to local state (real-time context will also add it)
      addMessage(chatRoomId, response.data);
      
      // Remove from property cache if this was an initial message
      if (property?.id) {
        removeMessageSentToProperty(property.id);
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message on error
      setNewMessage(messageContent);
    } finally {
      setSendingMessage(false);
    }
  }, [newMessage, chatRoomId, token, sendingMessage, sendTypingIndicator, addMessage, property, removeMessageSentToProperty, apiUrl]);
  
  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!chatRoomId || !isConnected) return;
    
    // Start typing indicator
    if (!isTypingRef.current) {
      sendTypingIndicator(chatRoomId, true);
      isTypingRef.current = true;
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        sendTypingIndicator(chatRoomId, false);
        isTypingRef.current = false;
      }
    }, 2000); // Stop typing after 2 seconds of inactivity
  }, [chatRoomId, isConnected, sendTypingIndicator]);
  
  // Handle back navigation
  const handleBackNavigation = useCallback(() => {
    const returnUrl = location.state?.returnUrl;
    if (returnUrl) {
      navigate(returnUrl);
    } else {
      navigate('/dashboard?tab=chats');
    }
  }, [navigate, location.state]);

  // Media handling functions
  const startVideoCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localStreamRef.current = stream;
      }
      
      setIsCallActive(true);
      setCallType('video');
      
    } catch (error) {
      console.error('Error starting video call:', error);
      alert('Unable to access camera/microphone. Please check permissions.');
    }
  };

  const startAudioCall = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      
      setIsCallActive(true);
      setCallType('audio');
      
    } catch (error) {
      console.error('Error starting audio call:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    setIsCallActive(false);
    setCallType(null);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('chatRoomId', chatRoomId!);
    
    try {
      const response = await fetch(`${apiUrl}/api/v1/chat/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      if (response.ok) {
        await response.json();
        // Add file message to chat
        const fileMessage = {
          id: Date.now().toString(),
          content: `📎 ${file.name}`,
          sender_id: user.id,
          sender_name: 'You',
          created_at: new Date().toISOString(),
          message_type: 'file',
          room_id: chatRoomId!,
          is_edited: false,
          is_deleted: false
        };
        addMessage(chatRoomId!, fileMessage);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        sendVoiceNote(audioBlob);
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
    } catch (error) {
      console.error('Error starting voice recording:', error);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
    }
  };

  const sendVoiceNote = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice-note.wav');
    formData.append('chatRoomId', chatRoomId!);
    
    try {
      const response = await fetch(`${apiUrl}/api/v1/chat/voice-note`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      if (response.ok) {
        await response.json();
        // Add voice note message to chat
        const voiceMessage = {
          id: Date.now().toString(),
          content: '🎤 Voice note',
          sender_id: user.id,
          sender_name: 'You',
          created_at: new Date().toISOString(),
          message_type: 'voice',
          room_id: chatRoomId!,
          is_edited: false,
          is_deleted: false
        };
        addMessage(chatRoomId!, voiceMessage);
      }
    } catch (error) {
      console.error('Error sending voice note:', error);
    }
  };
  
  // Load data on mount
  useEffect(() => {
    loadChatRoom();
    loadOnlineStatus();
    
    // Set up interval for online status
    const interval = setInterval(loadOnlineStatus, 30000); // Check every 30 seconds
    
    return () => {
      clearInterval(interval);
      // Stop typing indicator when leaving
      if (isTypingRef.current && chatRoomId) {
        sendTypingIndicator(chatRoomId, false);
      }
    };
  }, [loadChatRoom, loadOnlineStatus, chatRoomId, sendTypingIndicator]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, chatRoomId, scrollToBottom]);

  // Handle initial message sending
  useEffect(() => {
    const sendInitialMessage = async () => {
      if (!chatRoomId || !initialMessage || !initialMessage.trim() || sentInitialMessageRef.current) {
        console.log('🚫 [CHAT] sendInitialMessage blocked:', {
          hasChatRoomId: !!chatRoomId,
          hasInitialMessage: !!initialMessage,
          initialMessageTrimmed: initialMessage?.trim(),
          sentInitialMessage: sentInitialMessageRef.current
        });
        return;
      }

      // Set the flag immediately to prevent duplicate calls
      sentInitialMessageRef.current = true;

      // Check if we've already sent a message to this property
      // For temporary chat rooms, extract property ID from the chat room ID
      let propertyId = chatRoom?.property_id;
      if (!propertyId && chatRoomId?.startsWith('temp_')) {
        // Extract property ID from temporary chat room ID: temp_{property_id}_{timestamp}
        const parts = chatRoomId.split('_');
        if (parts.length >= 2) {
          propertyId = parts[1];
        }
      }
      
      // Note: We no longer check hasSentMessageToProperty here
      // The initial message will be sent if the chat room is empty

      const messageStartTime = performance.now();
      console.log(`📤 [PERF] Starting initial message send: "${initialMessage.substring(0, 50)}..."`);
      
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      // Optimistically add the initial message to UI immediately
      const optimisticMessage = {
        id: `temp-initial-${Date.now()}`,
        content: initialMessage,
        sender_id: user?.id || 'current-user',
        sender_name: user?.name || 'You',
        created_at: new Date().toISOString(),
        message_type: 'text',
        room_id: chatRoomId!,
        is_edited: false,
        is_deleted: false,
        is_read: false,
        read_at: undefined
      };
      addMessage(chatRoomId!, optimisticMessage);
      
      const optimisticTime = performance.now() - messageStartTime;
      console.log(`⚡ [PERF] Optimistic message displayed in ${optimisticTime.toFixed(2)}ms`);

      try {
        // Send the message in the background
        const sendStartTime = performance.now();
        let response: any;
        
        if (isTemporaryRoom) {
          // For temporary chat rooms, load property data first, then create the chat room
          console.log('🏗️ [CHAT] Creating chat room for temporary ID:', chatRoomId);
          
          // Load property data to get proper title and agent info
          let propertyData = property;
          if (!propertyData && propertyId) {
            try {
              const propertyResponse = await axios.get(`${apiUrl}/api/v1/fast/properties/${propertyId}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              propertyData = propertyResponse.data;
              setProperty(propertyData);
            } catch (error) {
              console.error('Error loading property for chat room creation:', error);
            }
          }
          
          const createRoomResponse = await axios.post(
            `${apiUrl}/api/v1/fast/chat/rooms`,
            {
              name: propertyData?.title || "Property Chat",
              room_type: "property",
              property_id: propertyId
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          // Update the chat room ID to the real one
          const realChatRoomId = createRoomResponse.data.id;
          console.log('✅ [CHAT] Chat room created with ID:', realChatRoomId);
          
          // Update the URL to use the real chat room ID
          navigate(`/chat/${realChatRoomId}`, { replace: true });
          
          // Send the message to the real chat room
          response = await axios.post(
            `${apiUrl}/api/v1/fast/chat/rooms/${realChatRoomId}/messages`,
            {
              content: initialMessage,
              message_type: 'text'
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          // Update chat room cache with the last message
          const updatedChatRoom = {
            id: realChatRoomId,
            property_id: propertyId,
            property_title: propertyData?.title || createRoomResponse.data.name,
            property_location: propertyData?.location || '',
            agent_id: createRoomResponse.data.created_by,
            agent_name: propertyData?.agent_name || 'Agent',
            status: 'active' as const,
            created_at: createRoomResponse.data.created_at,
            created_by: createRoomResponse.data.created_by,
            last_message: {
              id: response.data.id,
              content: response.data.content,
              sender_name: user?.name || 'You',
              created_at: response.data.created_at,
              is_edited: false
            }
          };
          addChatRoomToCache(updatedChatRoom);
        } else {
          // For existing chat rooms, send message directly
          response = await axios.post(
            `${apiUrl}/api/v1/fast/chat/rooms/${chatRoomId}/messages`,
            {
              content: initialMessage,
              message_type: 'text'
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
        
        const sendTime = performance.now() - sendStartTime;
        console.log(`📤 [PERF] Message sent to server in ${sendTime.toFixed(2)}ms`);
        
        // Replace the optimistic message with the real one
        const currentMessages = messages[chatRoomId || ''] || [];
        const updatedMessages = currentMessages.map((msg: any) => 
          msg.id === optimisticMessage.id 
            ? { 
                ...response.data, 
                sender_name: user?.name || 'You',
                is_read: response.data.is_read || false,
                read_at: response.data.read_at || undefined
              }
            : msg
        );
        setMessages(chatRoomId!, updatedMessages);

        // Mark message as sent to this property
        if (propertyId) {
          markMessageSentToProperty(propertyId);
        }

        const totalTime = performance.now() - messageStartTime;
        console.log(`✅ [PERF] Initial message flow completed in ${totalTime.toFixed(2)}ms`);

      } catch (error: any) {
        console.error('Error sending initial message:', error);
        
        // If it's a 404 error, the chat room might not exist yet
        if (error.response?.status === 404) {
          console.log('🔄 [CHAT] Chat room not found, will retry when room is created');
          // Reset the flag so we can try again
          sentInitialMessageRef.current = false;
          return;
        }
        
        // Remove the optimistic message on error
        const currentMessages = messages[chatRoomId || ''] || [];
        const filteredMessages = currentMessages.filter((msg: any) => msg.id !== optimisticMessage.id);
        setMessages(chatRoomId!, filteredMessages);
      }
    };

    // Only send initial message if we have a chat room and there are no existing messages
    const currentMessages = messages[chatRoomId || ''] || [];
    console.log('🔍 [DEBUG] EnhancedChatPage initial message check:', {
      hasChatRoom: !!chatRoom,
      chatRoomId: chatRoomId,
      initialMessage: initialMessage,
      initialMessageType: typeof initialMessage,
      initialMessageLength: initialMessage?.length,
      sentInitialMessage: sentInitialMessageRef.current,
      messagesLength: currentMessages.length,
      currentMessages: currentMessages,
      isTemporaryRoom: chatRoomId?.startsWith('temp_'),
      shouldSend: !!(initialMessage && initialMessage.trim() !== '' && !sentInitialMessageRef.current && currentMessages.length === 0 && (chatRoom || chatRoomId?.startsWith('temp_')))
    });
    
    // For temporary chat rooms, we don't need to wait for chatRoom to be loaded
    const isTemporaryRoom = chatRoomId?.startsWith('temp_');
    const shouldSendInitialMessage = initialMessage && 
                                   initialMessage.trim() !== '' && 
                                   !sentInitialMessageRef.current && 
                                   currentMessages.length === 0 &&
                                   (chatRoom || isTemporaryRoom);
    
    if (shouldSendInitialMessage) {
      console.log('💬 [CHAT] Sending initial message:', initialMessage);
      sendInitialMessage();
    } else {
      console.log('🚫 [CHAT] NOT sending initial message - conditions not met');
    }
  }, [chatRoom, initialMessage, chatRoomId, apiUrl, messages, user, hasSentMessageToProperty, markMessageSentToProperty, addMessage, setMessages, token, navigate, property, addChatRoomToCache]);
  
  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }
  
  if (!chatRoom) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Chat Room Not Found</h2>
          <button
            onClick={handleBackNavigation}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }
  
  const currentMessages = messages[chatRoomId || ''] || [];
  const currentTypingUsers = typingUsers[chatRoomId || ''] || [];
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
        <div className="max-w-4xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center py-2 sm:py-3 md:py-4">
            <div className="flex items-center">
              <button
                onClick={handleBackNavigation}
                className="ml-2 mr-3 sm:mr-4 text-white hover:text-blue-200 transition-colors"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center space-x-2 sm:space-x-3 py-1 sm:py-2">
                {(chatRoom?.agent_name || property?.agent_name) && (
                  <div className="w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-12 lg:h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-xs sm:text-sm md:text-base lg:text-lg font-bold">
                      {(chatRoom?.agent_name || property?.agent_name)?.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <h1 className="text-sm sm:text-base md:text-lg font-bold text-white truncate">
                    {chatRoom?.agent_name || property?.agent_name || 'Agent Chat'}
                  </h1>
                  <p className="text-blue-100 text-xs sm:text-sm truncate hidden sm:block">
                    {property?.title || chatRoom?.property_title || 'Property Chat'}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    {(chatRoom?.agent_rating || property?.agent_rating) && (
                      <div className="flex items-center bg-white bg-opacity-20 px-2 py-1 rounded-full w-fit">
                        <span className="text-yellow-300 text-xs sm:text-sm">⭐</span>
                        <span className="text-white text-xs sm:text-sm ml-1 font-medium">
                          {Number(chatRoom?.agent_rating || property?.agent_rating).toFixed(1)}
                        </span>
                      </div>
                    )}
                    {/* Online Status Indicator */}
                    <div className="flex items-center bg-white bg-opacity-20 px-2 py-1 rounded-full w-fit">
                      <div className={`w-2 h-2 rounded-full mr-1 ${
                        (isConnected || (chatRoom && currentMessages.length > 0)) ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                      }`}></div>
                      <span className="text-white text-xs sm:text-sm font-medium">
                        {(isConnected || (chatRoom && currentMessages.length > 0)) ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                    {onlineStatus.agent_online && (
                      <div className="flex items-center bg-white bg-opacity-20 px-2 py-1 rounded-full w-fit">
                        <span className="text-green-300 text-xs sm:text-sm">•</span>
                        <span className="text-white text-xs sm:text-sm ml-1 font-medium">Agent Online</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
              {!isCallActive && (
                <>
                  {/* Video Call Button */}
                  <button
                    onClick={startVideoCall}
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 active:bg-opacity-40 text-white px-2 sm:px-3 py-2 rounded-lg text-xs flex items-center justify-center min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] md:min-w-0 md:min-h-0 space-x-1 transition-all duration-200 backdrop-blur-sm touch-manipulation"
                    title="Start Video Call"
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="hidden sm:inline text-xs">Video</span>
                  </button>

                  {/* Audio Call Button */}
                  <button
                    onClick={startAudioCall}
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 active:bg-opacity-40 text-white px-2 sm:px-3 py-2 rounded-lg text-xs flex items-center justify-center min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] md:min-w-0 md:min-h-0 space-x-1 transition-all duration-200 backdrop-blur-sm touch-manipulation"
                    title="Start Audio Call"
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="hidden sm:inline text-xs">Audio</span>
                  </button>
                </>
              )}

              {isCallActive && (
                <>
                  {/* Mute Button */}
                  <button
                    onClick={toggleMute}
                    className={`px-2 sm:px-3 py-2 rounded-lg text-xs flex items-center justify-center min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] md:min-w-0 md:min-h-0 space-x-1 transition-all duration-200 backdrop-blur-sm touch-manipulation ${
                      isMuted ? 'bg-red-500 bg-opacity-80 hover:bg-opacity-90' : 'bg-white bg-opacity-20 hover:bg-opacity-30'
                    } text-white`}
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {isMuted ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      )}
                    </svg>
                    <span className="hidden sm:inline text-xs">{isMuted ? 'Unmute' : 'Mute'}</span>
                  </button>

                  {/* Video Toggle Button (only for video calls) */}
                  {callType === 'video' && (
                    <button
                      onClick={toggleVideo}
                      className={`px-2 sm:px-3 py-2 rounded-lg text-xs flex items-center justify-center min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] md:min-w-0 md:min-h-0 space-x-1 transition-all duration-200 backdrop-blur-sm touch-manipulation ${
                        !isVideoEnabled ? 'bg-red-500 bg-opacity-80 hover:bg-opacity-90' : 'bg-white bg-opacity-20 hover:bg-opacity-30'
                      } text-white`}
                      title={isVideoEnabled ? "Turn off video" : "Turn on video"}
                    >
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {isVideoEnabled ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                        )}
                      </svg>
                      <span className="hidden sm:inline text-xs">{isVideoEnabled ? 'Video' : 'No Video'}</span>
                    </button>
                  )}

                  {/* End Call Button */}
                  <button
                    onClick={endCall}
                    className="bg-red-500 bg-opacity-80 hover:bg-opacity-90 text-white px-2 sm:px-3 py-2 rounded-lg text-xs flex items-center justify-center min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] md:min-w-0 md:min-h-0 space-x-1 transition-all duration-200 backdrop-blur-sm touch-manipulation"
                    title="End Call"
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="hidden sm:inline text-xs">End</span>
                  </button>
                </>
              )}

              {/* Close Button (Desktop only) */}
              <button
                onClick={handleBackNavigation}
                className="hidden lg:flex bg-red-500 bg-opacity-80 hover:bg-opacity-90 active:bg-opacity-100 text-white px-2 sm:px-3 py-2 rounded-lg text-xs flex items-center justify-center min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] md:min-w-0 md:min-h-0 space-x-1 transition-all duration-200 backdrop-blur-sm touch-manipulation"
                title="Close Chat"
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="hidden sm:inline text-xs">Close</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Messages */}
      <div className="max-w-4xl mx-auto px-1 sm:px-4 lg:px-8">
        <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg sm:shadow-xl h-[calc(100vh-200px)] sm:h-[500px] md:h-[600px] overflow-y-auto p-3 sm:p-3 md:p-4 lg:p-6">
          {currentMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-700 mb-2">Start the conversation</h3>
                <p className="text-sm sm:text-base text-gray-500">Send a message to begin chatting</p>
              </div>
            </div>
          ) : (
            <>
              {currentMessages.map((message) => {
                const isCurrentUser = message.sender_id === user.id;
                return (
                  <div
                    key={message.id}
                    className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} mb-4 sm:mb-3 md:mb-4 lg:mb-6`}
                  >
                    {/* Message bubble */}
                    <div
                      className={`max-w-[85%] sm:max-w-sm md:max-w-md lg:max-w-lg px-4 sm:px-4 md:px-6 py-3 sm:py-3 md:py-4 rounded-2xl sm:rounded-xl md:rounded-2xl shadow-md ${
                        isCurrentUser
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-lg sm:rounded-br-xl md:rounded-br-2xl'
                          : 'bg-gray-50 border-2 border-gray-100 text-gray-900 rounded-bl-lg sm:rounded-bl-xl md:rounded-bl-2xl'
                      }`}
                    >
                      <p className="text-sm sm:text-sm md:text-base break-words leading-relaxed">{message.content}</p>
                    </div>
                    
                    {/* Name, avatar, timestamp, and checkmarks - outside the bubble */}
                    <div className={`flex flex-col mt-2 sm:mt-1.5 ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                      {/* Top row: Name, Avatar, Time */}
                      <div className="flex items-center space-x-2 sm:space-x-2">
                        {/* Name first */}
                        <span className="text-sm sm:text-sm font-semibold text-gray-700">
                          {isCurrentUser ? 'You' : message.sender_name}
                        </span>
                        
                        {/* Avatar */}
                        {!isCurrentUser && (
                          <div className="w-5 h-5 sm:w-5 sm:h-5 bg-gradient-to-r from-purple-400 to-blue-500 rounded-full flex items-center justify-center shadow-sm">
                            <span className="text-xs sm:text-sm font-bold text-white">
                              {message.sender_name?.charAt(0) || 'A'}
                            </span>
                          </div>
                        )}
                        
                        {/* Time */}
                        <span className="text-xs text-gray-500 font-medium">
                          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      {/* Bottom row: Checkmarks under the time (only for current user) */}
                      {isCurrentUser && (
                        <div className="flex items-center mt-1">
                          {/* First checkmark - always shown (delivered) */}
                          <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {/* Second checkmark - only shown when message is read */}
                          {message.is_read && (
                            <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20" style={{ transform: 'translate(-2px, 0px)' }}>
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {/* Typing indicators */}
              {currentTypingUsers.length > 0 && (
                <div className="flex justify-start mb-4 sm:mb-3 md:mb-4 lg:mb-6">
                  <div className="bg-gray-50 border-2 border-gray-100 px-4 sm:px-4 md:px-6 py-3 sm:py-3 md:py-4 rounded-2xl sm:rounded-xl md:rounded-2xl rounded-bl-lg shadow-md">
                    <div className="flex items-center space-x-2 sm:space-x-2 md:space-x-3">
                      <div className="flex space-x-1 sm:space-x-1">
                        <div className="w-2 h-2 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="text-sm sm:text-sm text-gray-700 font-medium">
                        {currentTypingUsers.map(u => u.user_name).join(', ')} {currentTypingUsers.length === 1 ? 'is' : 'are'} typing...
                      </span>
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
        <form onSubmit={sendMessage} className="border-t border-gray-200 p-3 sm:p-3 md:p-4 lg:p-6 bg-white shadow-lg">
          <div className="flex items-end space-x-2 sm:space-x-2 md:space-x-3 lg:space-x-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="w-full border-2 border-gray-200 rounded-2xl sm:rounded-xl md:rounded-2xl px-4 sm:px-4 md:px-6 py-3 sm:py-3 md:py-4 pr-20 sm:pr-20 md:pr-24 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white shadow-md focus:shadow-lg text-sm sm:text-sm md:text-base"
                disabled={sendingMessage}
              />
              {/* Enhanced Communication Buttons */}
              <div className="absolute right-3 sm:right-3 md:right-5 top-1/2 transform -translate-y-1/2 flex items-center space-x-1.5">
                {/* File Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-gray-500 hover:text-green-500 transition-colors p-2 rounded-full hover:bg-gray-100 min-w-[40px] min-h-[40px] flex items-center justify-center"
                  title="Upload File"
                >
                  <svg className="w-5 h-5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>

                {/* Voice Note Button */}
                <button
                  type="button"
                  onMouseDown={startVoiceRecording}
                  onMouseUp={stopVoiceRecording}
                  onMouseLeave={stopVoiceRecording}
                  onTouchStart={startVoiceRecording}
                  onTouchEnd={stopVoiceRecording}
                  className={`text-gray-500 transition-colors p-2 rounded-full hover:bg-gray-100 min-w-[40px] min-h-[40px] flex items-center justify-center ${
                    isRecordingVoice ? 'text-red-500 hover:text-red-600 bg-red-50' : 'hover:text-purple-500'
                  }`}
                  title={isRecordingVoice ? "Recording... Release to send" : "Hold to record voice note"}
                >
                  <svg className="w-5 h-5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>

                {/* Emoji Picker Button */}
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="text-gray-500 hover:text-blue-500 transition-colors p-2 rounded-full hover:bg-gray-100 min-w-[40px] min-h-[40px] flex items-center justify-center"
                  title="Add Emoji"
                >
                  <svg className="w-5 h-5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
              />
            </div>
            <button
              type="submit"
              disabled={!newMessage.trim() || sendingMessage}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 text-white px-4 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-3 md:py-4 rounded-2xl sm:rounded-xl md:rounded-2xl font-semibold transition-all duration-200 flex items-center justify-center space-x-1 sm:space-x-2 shadow-lg hover:shadow-xl disabled:shadow-none hover:scale-105 disabled:hover:scale-100 text-sm sm:text-sm md:text-base min-w-[50px] min-h-[50px] sm:min-w-0 sm:min-h-0"
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
            <div className="mt-3 sm:mt-3 md:mt-4 p-3 sm:p-3 md:p-5 bg-white rounded-2xl sm:rounded-xl md:rounded-2xl shadow-lg sm:shadow-xl border-2 border-gray-100">
              <div className="grid grid-cols-6 sm:grid-cols-6 md:grid-cols-8 gap-2 sm:gap-2 md:gap-4">
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

      {/* Video Call Interface */}
      {isCallActive && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="relative w-full h-full max-w-4xl mx-auto p-4">
            {/* Local Video */}
            {callType === 'video' && (
              <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden shadow-lg">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  You
                </div>
              </div>
            )}

            {/* Call Controls */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-4">
              {/* Mute Button */}
              <button
                onClick={toggleMute}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white bg-opacity-20 hover:bg-opacity-30'
                } text-white backdrop-blur-sm`}
                title={isMuted ? "Unmute" : "Mute"}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMuted ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  )}
                </svg>
              </button>

              {/* Video Toggle Button (only for video calls) */}
              {callType === 'video' && (
                <button
                  onClick={toggleVideo}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                    !isVideoEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-white bg-opacity-20 hover:bg-opacity-30'
                  } text-white backdrop-blur-sm`}
                  title={isVideoEnabled ? "Turn off video" : "Turn on video"}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isVideoEnabled ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                    )}
                  </svg>
                </button>
              )}

              {/* End Call Button */}
              <button
                onClick={endCall}
                className="w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-all duration-200 text-white"
                title="End Call"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Call Status */}
            <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-center">
              <h2 className="text-white text-xl font-semibold mb-2">
                {callType === 'video' ? 'Video Call' : 'Audio Call'}
              </h2>
              <p className="text-gray-300 text-sm">
                {callType === 'video' ? 'Camera and microphone active' : 'Microphone active'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedChatPage;
