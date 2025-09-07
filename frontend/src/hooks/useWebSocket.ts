import { useEffect, useRef, useCallback, useState } from 'react';
import { useNotifications } from '../contexts/NotificationContext';

interface WebSocketMessage {
  type: 'message' | 'notification' | 'typing' | 'user_joined' | 'user_left';
  data: any;
  room_id?: string;
  sender_id?: string;
  sender_name?: string;
}

interface UseWebSocketProps {
  apiUrl: string;
  userId: string | null;
  chatRoomId?: string;
  onMessage?: (message: any) => void;
  onTyping?: (data: any) => void;
}

export const useWebSocket = ({ 
  apiUrl, 
  userId, 
  chatRoomId, 
  onMessage, 
  onTyping 
}: UseWebSocketProps) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const lastConnectTimeRef = useRef(0);
  const minConnectInterval = 2000; // Minimum 2 seconds between connection attempts
  const [isConnected, setIsConnected] = useState(false);
  const { addNotification } = useNotifications();

  const connect = useCallback(() => {
    if (!userId) {
      console.log('WebSocket: No userId provided, skipping connection');
      return;
    }

    // Don't create multiple connections
    if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
      console.log('WebSocket: Already connected or connecting, skipping');
      return;
    }

    // Debounce connection attempts
    const now = Date.now();
    if (now - lastConnectTimeRef.current < minConnectInterval) {
      console.log('WebSocket: Connection attempt too soon, skipping');
      return;
    }
    lastConnectTimeRef.current = now;

    // Clean up any existing connection before creating a new one
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.onopen = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      // Connect to global notification WebSocket (not room-specific)
      const wsBaseUrl = process.env.REACT_APP_WS_URL || apiUrl.replace('http', 'ws');
      const wsUrl = `${wsBaseUrl}/api/v1/chat/ws/notifications?user_id=${userId}`;
      console.log('WebSocket: Attempting to connect to', wsUrl);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected for notifications');
        setIsConnected(true);
        // Reset reconnect attempts on successful connection
        reconnectAttemptsRef.current = 0;
        // Clear any pending reconnection
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'message':
              // Handle new message notification
              if (message.sender_id !== userId) { // Don't notify for own messages
                addNotification({
                  type: 'message',
                  title: `New message from ${message.sender_name || 'Unknown'}`,
                  message: message.data.content || 'New message received',
                  chatRoomId: message.room_id,
                  propertyId: message.data.property_id
                });
              }
              
              // Call the onMessage callback if provided
              if (onMessage) {
                // Pass the message data with room_id and sender info
                onMessage({
                  ...message.data,
                  room_id: message.room_id,
                  sender_id: message.sender_id,
                  sender_name: message.sender_name
                });
              }
              break;

            case 'notification':
              // Handle general notifications
              addNotification({
                type: message.data.type || 'message',
                title: message.data.title || 'New Notification',
                message: message.data.message || 'You have a new notification',
                chatRoomId: message.data.chatRoomId,
                propertyId: message.data.propertyId
              });
              break;

            case 'typing':
              // Handle typing indicators
              if (onTyping) {
                onTyping(message.data);
              }
              break;

            default:
              console.log('Unknown WebSocket message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected', event.code, event.reason);
        setIsConnected(false);
        
        // Only attempt to reconnect if we haven't exceeded max attempts
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000); // Exponential backoff, max 10s
          console.log(`WebSocket: Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.log('WebSocket: Max reconnection attempts reached, giving up');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  }, [apiUrl, userId, addNotification, onMessage, onTyping]);

  const disconnect = useCallback(() => {
    console.log('WebSocket: Disconnecting...');
    setIsConnected(false);
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      // Don't attempt to reconnect when manually disconnecting
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Reset reconnect attempts
    reconnectAttemptsRef.current = 0;
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    // Only connect if we have a valid userId
    if (userId) {
      // Only connect if not already connected
      if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
        connect();
      }
    }
    
    return () => {
      disconnect();
    };
  }, [userId, connect, disconnect]);

  const sendTypingIndicator = useCallback(async (roomId: string, isTyping: boolean) => {
    if (!roomId) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const endpoint = isTyping 
        ? `/api/v1/fast/chat/rooms/${roomId}/typing`
        : `/api/v1/fast/chat/rooms/${roomId}/typing/stop`;
      
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error('Failed to send typing indicator:', response.status);
      }
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  }, [apiUrl]);

  return {
    sendMessage,
    sendTypingIndicator,
    isConnected
  };
};
