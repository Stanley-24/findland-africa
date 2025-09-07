import React from 'react';
import ChatTab from '../common/ChatTab';
import { TabComponentProps, ChatRoom } from '../../types/buyerDashboard';

interface ChatsTabProps extends TabComponentProps {
  chatRooms: ChatRoom[];
  selectedChats: string[];
  onChatSelection: (chatId: string) => void;
  onSelectAllChats: () => void;
  onBatchDeleteChats: () => void;
  onDeleteSingleChat: (chatId: string) => void;
  onAgentProfileClick: (name: string, rating?: number, avatar?: string) => void;
}

const ChatsTab: React.FC<ChatsTabProps> = (props) => {
  return (
    <ChatTab
      {...props}
      userRole="buyer"
    />
  );
};

export default ChatsTab;