export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  type: 'rent' | 'sale' | 'land';
  price: number;
  location: string;
  status: 'available' | 'pending' | 'sold' | 'rented';
  created_at: string;
  owner_id: string;
  media?: Array<{
    id: string;
    media_type: string;
    url: string;
  }>;
  // Enhanced property features
  agent_verification?: {
    license_number?: string;
    certifications?: string[];
    verified: boolean;
    rating?: number;
    total_transactions?: number;
  };
  transaction_history?: {
    previous_sales?: number;
    price_trend?: 'increasing' | 'stable' | 'decreasing';
    days_on_market?: number;
  };
  neighborhood_insights?: {
    crime_rate?: 'low' | 'medium' | 'high';
    school_rating?: number;
    amenities?: string[];
    walkability_score?: number;
  };
  market_analysis?: {
    comparable_properties?: Array<{
      id: string;
      price: number;
      location: string;
      sold_date: string;
    }>;
    price_per_sqm?: number;
    market_trend?: 'bull' | 'bear' | 'stable';
  };
}

export interface Trade {
  id: string;
  property_id: string;
  property_title: string;
  property_location: string;
  type: 'buy' | 'sell' | 'rent';
  status: 'pending' | 'completed' | 'cancelled';
  price: number;
  created_at: string;
  updated_at: string;
  agent_id?: string;
  agent_name?: string;
  notes?: string;
}

export interface ChatRoom {
  id: string;
  property_id: string;
  property_title: string;
  property_location: string;
  agent_id: string;
  agent_name: string;
  agent_avatar?: string;
  agent_rating?: number;
  agent_online?: boolean;
  status: 'active' | 'inactive';
  created_at: string;
  created_by: string;
  last_message?: {
    id: string;
    content: string;
    sender_name: string;
    sender_avatar?: string;
    created_at: string;
    is_edited: boolean;
  };
  last_message_sender_avatar?: string;
}

export interface BuyerDashboardProps {
  user: User;
  apiUrl: string;
  onLogout: () => void;
  onCheckAgentApplication?: () => Promise<any>;
}

export interface TabComponentProps {
  user: User;
  apiUrl: string;
  onLogout: () => void;
  onCheckAgentApplication?: () => Promise<any>;
}
