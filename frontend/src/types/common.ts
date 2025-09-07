/**
 * Shared common types
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  phone?: string;
  phone_number?: string;
  is_active?: boolean;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  type: 'sale' | 'rent';
  price: number;
  location: string;
  status: 'available' | 'sold' | 'rented' | 'pending';
  agent_name?: string;
  agent_rating?: number;
  agent_phone?: string;
  agent_email?: string;
  created_at: string;
  updated_at: string;
  media?: Array<{
    id: string;
    url: string;
    type: string;
  }>;
}

export interface ChatRoom {
  id: string;
  property_id: string;
  property_title: string;
  property_location?: string;
  last_message?: string | {
    content: string;
    sender_name: string;
    created_at: string;
    is_edited?: boolean;
  };
  last_message_at?: string;
  last_message_sender_avatar?: string;
  message_count?: number;
  participants?: Array<{
    id?: string;
    user_id: string;
    user_name?: string;
    user_avatar?: string;
    role?: string;
    is_active?: boolean;
  }>;
  created_at: string;
  updated_at?: string;
  created_by?: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  content: string;
  message_type: 'text' | 'image' | 'file';
  is_read?: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TabComponentProps {
  user: User;
  apiUrl: string;
  onLogout: () => void;
  onCheckAgentApplication?: () => void;
}

export interface LoadingState {
  loading: boolean;
  error: string | null;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}
