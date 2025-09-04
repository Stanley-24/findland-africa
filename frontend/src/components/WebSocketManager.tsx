import React from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

interface WebSocketManagerProps {
  apiUrl: string;
  userId: string | null;
}

const WebSocketManager: React.FC<WebSocketManagerProps> = ({ apiUrl, userId }) => {
  useWebSocket({
    apiUrl,
    userId,
    onMessage: (message) => {
      // Handle real-time messages if needed
      console.log('Real-time message received:', message);
    },
    onTyping: (data) => {
      // Handle typing indicators if needed
      console.log('Typing indicator:', data);
    }
  });

  return null; // This component doesn't render anything
};

export default WebSocketManager;
