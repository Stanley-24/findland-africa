export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone_number?: string;
  is_active: boolean;
  is_verified: boolean;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  type: 'rent' | 'sale' | 'land';
  price: number;
  location: string;
  status: string;
  created_at: string;
  media?: Array<{
    id: string;
    media_type: string;
    url: string;
  }>;
}

export interface Application {
  id: string;
  property_title: string;
  property_location: string;
  loan_amount: number;
  status: 'approved' | 'pending' | 'rejected';
  created_at: string;
}

export interface ChatRoom {
  id: string;
  property_id: string;
  property_title: string;
  property_location: string;
  last_message?: {
    content: string;
    sender_name: string;
    created_at: string;
    is_edited?: boolean;
  };
  last_message_sender_avatar?: string;
  message_count: number;
  created_at: string;
  created_by: string;
  agent_name?: string;
  agent_rating?: number;
  agent_avatar?: string;
  agent_online?: boolean;
  participants?: Array<{
    id: string;
    user_id: string;
    role: string;
    is_active: boolean;
  }>;
}

export interface Analytics {
  totalViews: number;
  totalInquiries: number;
  conversionRate: number;
  avgResponseTime: string;
  topPerformingProperty: string;
  monthlyRevenue: number;
  pendingApplications: number;
  activeChats: number;
}

export interface SellerDashboardProps {
  user: User;
  apiUrl: string;
  onLogout: () => void;
}

export interface TabComponentProps {
  user: User;
  apiUrl: string;
  onLogout: () => void;
}
