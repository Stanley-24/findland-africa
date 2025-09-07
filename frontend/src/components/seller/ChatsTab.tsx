import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../utils/dateUtils';
import { truncateMessage, truncateMessageMobile } from '../../utils/textUtils';
import { TabComponentProps, ChatRoom } from '../../types/sellerDashboard';
import { useRealTimeChat } from '../../contexts/RealTimeChatContext';

interface ChatsTabProps extends TabComponentProps {
  chatRooms: ChatRoom[];
  selectedChats: string[];
  onChatSelection: (chatId: string) => void;
  onSelectAllChats: () => void;
  onBatchDeleteChats: () => void;
  onDeleteSingleChat: (chatId: string) => void;
  onAgentProfileClick: (name: string, rating?: number, avatar?: string) => void;
  onNavigateToProperties: () => void;
}

const ChatsTab: React.FC<ChatsTabProps> = ({
  user,
  chatRooms,
  selectedChats,
  onChatSelection,
  onSelectAllChats,
  onBatchDeleteChats,
  onDeleteSingleChat,
  onAgentProfileClick,
  onNavigateToProperties,
}) => {
  const navigate = useNavigate();
  const { unreadCounts, clearUnreadCount } = useRealTimeChat();

  const handleChatClick = (chatId: string) => {
    navigate(`/chat/${chatId}`);
    if (clearUnreadCount) {
      clearUnreadCount(chatId);
    }
  };

  const handleViewProperty = (propertyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/property/${propertyId}`);
  };

  const filteredChatRooms = chatRooms.filter(chat => chat.property_id);

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
          Your property inquiries will appear here once buyers start chatting.
        </p>
        {onNavigateToProperties && (
          <button
            onClick={onNavigateToProperties}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Properties
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
          
          // Get the last message content
          const lastMessageContent = typeof chat.last_message === 'string' 
            ? chat.last_message 
            : chat.last_message?.content || 'No messages yet';
          
          // Get the sender name for the last message (this will be the buyer's name)
          const lastMessageSender = typeof chat.last_message === 'object' && chat.last_message?.sender_name
            ? chat.last_message.sender_name
            : 'Unknown Buyer';
          
          // Use the last message sender as the buyer name
          const buyerName = lastMessageSender;
          
          // Get first name only (split by space and take first part)
          const firstName = lastMessageSender.split(' ')[0];
          
          // Get first 4 letters of first name for mobile display
          const shortSenderName = firstName.length > 4 
            ? firstName.substring(0, 4) 
            : firstName;
          
          return (
            <div
              key={chat.id}
              className={`bg-white rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-md ${
                isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                {/* Left side - Agent name and message info */}
                <div className="flex-1 min-w-0">
                  {/* Agent name bold at top */}
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-bold text-gray-900 truncate">
                      {buyerName}
                    </h3>
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 font-bold">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  
                  {/* Middle - Sender name: message preview and time */}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <span className="font-medium text-gray-800">
                        <span className="hidden sm:inline">{firstName}:</span>
                        <span className="sm:hidden">{shortSenderName}:</span>
                      </span>
                      <span className="hidden sm:inline">
                        {truncateMessage(lastMessageContent, 50)}
                      </span>
                      <span className="sm:hidden">
                        {truncateMessageMobile(lastMessageContent, 30)}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      {typeof chat.last_message === 'object' && chat.last_message?.created_at 
                        ? formatDate(chat.last_message.created_at) 
                        : 'No activity'}
                    </div>
                  </div>
                </div>
                
                {/* Right side - Action buttons and controls */}
                <div className="flex items-center space-x-1 sm:space-x-2 ml-2 sm:ml-4">
                  {/* View Chat button */}
                  <button
                    onClick={() => handleChatClick(chat.id)}
                    className="bg-blue-600 text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded text-xs sm:text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    <span className="hidden sm:inline">View Chat</span>
                    <span className="sm:hidden">Chat</span>
                  </button>
                  
                  {/* View Property button */}
                  {chat.property_id && (
                    <button
                      onClick={(e) => handleViewProperty(chat.property_id!, e)}
                      className="bg-green-600 text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded text-xs sm:text-sm font-medium hover:bg-green-700 transition-colors"
                    >
                      <span className="hidden sm:inline">View Property</span>
                      <span className="sm:hidden">Prop</span>
                    </button>
                  )}
                  
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSingleChat(chat.id);
                    }}
                    className="text-red-500 hover:text-red-700 p-0.5 sm:p-1"
                    title="Delete conversation"
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  
                  {/* Batch selection checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      onChatSelection(chat.id);
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3 sm:w-4 sm:h-4"
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

export default ChatsTab;