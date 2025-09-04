import { useEffect, useRef, useCallback } from 'react';
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
  const { addNotification } = useNotifications();

  const connect = useCallback(() => {
    if (!userId) return;

    try {
      // Connect to global notification WebSocket (not room-specific)
      const wsUrl = `${apiUrl.replace('http', 'ws')}/api/v1/chat/ws/notifications?user_id=${userId}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected for notifications');
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
                onMessage(message.data);
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

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  }, [apiUrl, userId, addNotification, onMessage, onTyping]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    sendMessage,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN
  };
};
