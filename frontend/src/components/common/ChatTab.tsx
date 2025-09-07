import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../utils/dateUtils';
import { truncateMessage, truncateMessageMobile } from '../../utils/textUtils';
import { TabComponentProps, ChatRoom } from '../../types/common';

interface ChatTabProps extends TabComponentProps {
  chatRooms: ChatRoom[];
  selectedChats: string[];
  onChatSelection: (chatId: string) => void;
  onSelectAllChats: () => void;
  onBatchDeleteChats: () => void;
  onDeleteSingleChat: (chatId: string) => void;
  onAgentProfileClick: (name: string, rating?: number, avatar?: string) => void;
  onNavigateToProperties?: () => void;
  userRole: 'buyer' | 'seller';
  unreadCounts?: Record<string, number>;
  clearUnreadCount?: (roomId: string) => void;
}

const ChatTab: React.FC<ChatTabProps> = ({
  user,
  chatRooms,
  selectedChats,
  onChatSelection,
  onSelectAllChats,
  onBatchDeleteChats,
  onDeleteSingleChat,
  onAgentProfileClick,
  onNavigateToProperties,
  userRole,
  unreadCounts = {},
  clearUnreadCount,
}) => {
  const navigate = useNavigate();

  // Utility function to check if user can delete a chat room
  const canUserDeleteChat = (chat: ChatRoom): boolean => {
    if (userRole === 'buyer') {
      // Buyers can delete their own chat rooms
      return chat.participants?.some(participant => participant.user_id === user.id) || false;
    } else {
      // Sellers can see all chat rooms related to their properties
      return true;
    }
  };

  // Utility function to check if user can see a chat room
  const canUserSeeChat = (chat: ChatRoom): boolean => {
    if (userRole === 'buyer') {
      return chat.participants?.some(participant => participant.user_id === user.id) || false;
    } else {
      // Sellers can see all chat rooms related to their properties
      return true;
    }
  };

  const handleChatClick = (chatId: string) => {
    navigate(`/chat/${chatId}`);
    if (clearUnreadCount) {
      clearUnreadCount(chatId);
    }
  };

  const filteredChatRooms = chatRooms.filter(canUserSeeChat);

  if (filteredChatRooms.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Conversations Yet</h3>
        <p className="text-gray-600 mb-4">
          {userRole === 'buyer' 
            ? "Start browsing properties and initiate conversations with agents!"
            : "Your property inquiries will appear here once buyers start chatting."
          }
        </p>
        {onNavigateToProperties && (
          <button
            onClick={onNavigateToProperties}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {userRole === 'buyer' ? 'Browse Properties' : 'View Properties'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-900">My Conversations</h2>
          <span className="text-sm text-gray-500">
            {filteredChatRooms.length} conversation{filteredChatRooms.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        {filteredChatRooms.length > 0 && (
          <div className="flex items-center space-x-2">
            <button
              onClick={onSelectAllChats}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <span className="hidden sm:inline">Select All</span>
              <span className="sm:hidden">All</span>
            </button>
            {selectedChats.length > 0 && (
              <button
                onClick={onBatchDeleteChats}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Delete Selected ({selectedChats.length})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Chat rooms list */}
      <div className="space-y-3">
        {filteredChatRooms.map((chat) => {
          const unreadCount = unreadCounts[chat.id] || 0;
          const isSelected = selectedChats.includes(chat.id);
          const canDelete = canUserDeleteChat(chat);
          
          return (
            <div
              key={chat.id}
              className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleChatClick(chat.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {chat.property_title}
                    </h3>
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 font-bold">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                    <span className="hidden sm:inline">
                      {truncateMessage(
                        typeof chat.last_message === 'string' 
                          ? chat.last_message 
                          : chat.last_message?.content || 'No messages yet'
                      )}
                    </span>
                    <span className="sm:hidden">
                      {truncateMessageMobile(
                        typeof chat.last_message === 'string' 
                          ? chat.last_message 
                          : chat.last_message?.content || 'No messages yet'
                      )}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {chat.last_message_at ? formatDate(chat.last_message_at) : 'No activity'}
                    </span>
                    {chat.participants && chat.participants.length > 0 && (
                      <span>
                        {chat.participants.length} participant{chat.participants.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  {canDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSingleChat(chat.id);
                      }}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Delete conversation"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                  
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      onChatSelection(chat.id);
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChatTab;
