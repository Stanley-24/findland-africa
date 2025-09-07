import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

interface Property {
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
}

interface ChatRoom {
  id: string;
  property_id: string;
  property_title: string;
  property_location: string;
  agent_id: string;
  agent_name: string;
  agent_avatar?: string;
  agent_rating?: number;
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

interface DataCacheContextType {
  properties: Property[];
  featuredProperties: Property[];
  chatRooms: ChatRoom[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  refreshData: () => Promise<void>;
  getPropertyById: (id: string) => Property | undefined;
  getPropertiesByType: (type: 'rent' | 'sale') => Property[];
  getChatRoomByPropertyId: (propertyId: string) => ChatRoom | undefined;
  preloadChatRoom: (propertyId: string, userId?: string, ownerId?: string) => Promise<ChatRoom | null>;
  preloadChatRoomsForProperties: (properties: Property[], userId: string) => Promise<void>;
  removeChatRoomFromCache: (chatRoomId: string) => void;
  removeChatRoomByPropertyId: (propertyId: string) => void;
  addChatRoomToCache: (chatRoom: ChatRoom) => void;
  isDataStale: () => boolean;
  hasSentMessageToProperty: (propertyId: string) => boolean;
  markMessageSentToProperty: (propertyId: string) => void;
  removeMessageSentToProperty: (propertyId: string) => void;
}

const DataCacheContext = createContext<DataCacheContextType | undefined>(undefined);

interface DataCacheProviderProps {
  children: ReactNode;
  apiUrl: string;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const CACHE_KEY = 'findland_properties_cache';
const CHAT_CACHE_KEY = 'findland_chat_rooms_cache';
const SENT_MESSAGES_KEY = 'findland_sent_messages_cache';

interface CacheData {
  properties: Property[];
  featuredProperties: Property[];
  timestamp: number;
}

interface ChatCacheData {
  chatRooms: ChatRoom[];
  timestamp: number;
}

interface SentMessagesCache {
  sentPropertyIds: string[]; // Store as array for JSON serialization
  timestamp: number;
}

export const DataCacheProvider: React.FC<DataCacheProviderProps> = ({ children, apiUrl }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const preloadingRooms = useRef<Set<string>>(new Set());

  // Get current user ID for WebSocket
  const userId = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).id : null;

  // WebSocket integration for real-time updates
  useWebSocket({
    apiUrl,
    userId,
    onMessage: useCallback((message: any) => {
      console.log('DataCache received WebSocket message:', message);
      
      if (message.type === 'message') {
        // Update chat room with new message
        setChatRooms(prev => prev.map(room => 
          room.id === message.data.room_id 
            ? { 
                ...room, 
                last_message: {
                  id: message.data.id,
                  content: message.data.content,
                  sender_name: message.data.sender_name,
                  created_at: message.data.created_at,
                  is_edited: false
                }
              }
            : room
        ));
        
        // Update cache - don't filter out rooms without last_message
        setChatRooms(prev => {
          saveChatRoomsToCache(prev);
          return prev;
        });
      } else if (message.type === 'room_created') {
        // Handle room creation - add to chat rooms list
        console.log('📝 [CACHE] Received room_created WebSocket event:', message.data);
        const newRoom: ChatRoom = {
          id: message.data.id,
          property_id: message.data.property_id,
          property_title: message.data.property_title,
          property_location: message.data.property_location,
          agent_id: message.data.agent_id,
          agent_name: message.data.agent_name,
          agent_avatar: message.data.agent_avatar,
          agent_rating: message.data.agent_rating,
          status: message.data.status || 'active',
          created_at: message.data.created_at,
          created_by: message.data.created_by,
          last_message: message.data.last_message,
          last_message_sender_avatar: message.data.last_message_sender_avatar
        };
        
        setChatRooms(prev => {
          // Check if room already exists, update if it does, otherwise add
          const exists = prev.some(room => room.id === newRoom.id);
          if (exists) {
            const updated = prev.map(room => room.id === newRoom.id ? { ...room, ...newRoom } : room);
            saveChatRoomsToCache(updated);
            return updated;
          }
          
          const updated = [...prev, newRoom];
          saveChatRoomsToCache(updated);
          return updated;
        });
      }
    }, [])
  });

  const loadCachedData = () => {
    try {
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const parsed: CacheData = JSON.parse(cachedData);
        const now = Date.now();
        
        // Check if cache is still valid (not expired)
        if (now - parsed.timestamp < CACHE_DURATION) {
          console.log('Loading properties from cache');
          setProperties(parsed.properties);
          setFeaturedProperties(parsed.featuredProperties);
          setLastUpdated(parsed.timestamp);
          setLoading(false);
          return true; // Cache was valid
        } else {
          console.log('Cache expired, will fetch fresh data');
          localStorage.removeItem(CACHE_KEY);
        }
      }
    } catch (error) {
      console.error('Error loading cached data:', error);
      localStorage.removeItem(CACHE_KEY);
    }
    return false; // No valid cache
  };

  const saveToCache = (propertiesData: Property[], featuredData: Property[]) => {
    try {
      const cacheData: CacheData = {
        properties: propertiesData,
        featuredProperties: featuredData,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log('Properties data cached successfully');
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };

  const loadCachedChatRooms = () => {
    try {
      const cachedData = localStorage.getItem(CHAT_CACHE_KEY);
      if (cachedData) {
        const parsed: ChatCacheData = JSON.parse(cachedData);
        const now = Date.now();
        
        // Check if cache is still valid (not expired)
        if (now - parsed.timestamp < CACHE_DURATION) {
          console.log('Loading chat rooms from cache');
          setChatRooms(parsed.chatRooms);
          return true; // Cache was valid
        } else {
          console.log('Chat cache expired, will fetch fresh data');
          localStorage.removeItem(CHAT_CACHE_KEY);
        }
      }
    } catch (error) {
      console.error('Error loading cached chat rooms:', error);
      localStorage.removeItem(CHAT_CACHE_KEY);
    }
    return false; // No valid cache
  };

  const saveChatRoomsToCache = (chatRoomsData: ChatRoom[]) => {
    try {
      const cacheData: ChatCacheData = {
        chatRooms: chatRoomsData,
        timestamp: Date.now()
      };
      localStorage.setItem(CHAT_CACHE_KEY, JSON.stringify(cacheData));
      console.log('Chat rooms data cached successfully');
    } catch (error) {
      console.error('Error saving chat rooms to cache:', error);
    }
  };

  const preloadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Preloading properties and chat rooms data...');
      
      // Get authentication token
      const token = localStorage.getItem('token');
      
      // Fetch all properties and chat rooms in parallel
      const [allPropertiesResponse, featuredResponse, chatRoomsResponse] = await Promise.all([
        fetch(`${apiUrl}/api/v1/fast/properties/?limit=50`),
        fetch(`${apiUrl}/api/v1/fast/properties/?limit=12`),
        token ? fetch(`${apiUrl}/api/v1/fast/chat/rooms`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }) : Promise.resolve(null)
      ]);

      if (!allPropertiesResponse.ok || !featuredResponse.ok) {
        throw new Error('Failed to fetch properties data');
      }

      const [allPropertiesData, featuredData] = await Promise.all([
        allPropertiesResponse.json(),
        featuredResponse.json()
      ]);

      // Handle chat rooms response
      let chatRoomsData: ChatRoom[] = [];
      if (chatRoomsResponse && chatRoomsResponse.ok) {
        const allChatRooms = await chatRoomsResponse.json();
        // Don't filter out empty chat rooms - they might be newly created
        chatRoomsData = allChatRooms;
        console.log(`Loaded ${chatRoomsData.length} chat rooms`);
      }

      // Update state
      setProperties(allPropertiesData);
      setFeaturedProperties(featuredData);
      setChatRooms(chatRoomsData);
      setLastUpdated(Date.now());
      
      // Save to cache
      saveToCache(allPropertiesData, featuredData);
      saveChatRoomsToCache(chatRoomsData);
      
      console.log(`Preloaded ${allPropertiesData.length} properties, ${featuredData.length} featured properties, and ${chatRoomsData.length} chat rooms with messages`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error preloading data:', err);
      
      // If we have cached data, use it even if it's stale
      if (properties.length === 0) {
        loadCachedData();
      }
    } finally {
      setLoading(false);
    }
  }, [apiUrl, properties.length]);

  // Load cached data on mount
  useEffect(() => {
    loadCachedData();
    loadCachedChatRooms();
    // Start preloading fresh data
    preloadData();
  }, [apiUrl, preloadData]);

  const refreshData = async () => {
    console.log('Manually refreshing properties data...');
    await preloadData();
  };

  const getPropertyById = (id: string): Property | undefined => {
    return properties.find(property => property.id === id);
  };

  const getPropertiesByType = (type: 'rent' | 'sale'): Property[] => {
    return properties.filter(property => property.type === type);
  };

  const getChatRoomByPropertyId = (propertyId: string): ChatRoom | undefined => {
    return chatRooms.find(room => room.property_id === propertyId);
  };

  const preloadChatRoom = async (propertyId: string, userId?: string, ownerId?: string): Promise<ChatRoom | null> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No authentication token found for chat room preloading');
        return null;
      }

      // Check if we already have this chat room cached
      const existingRoom = getChatRoomByPropertyId(propertyId);
      if (existingRoom) {
        console.log('Chat room already cached for property:', propertyId);
        return existingRoom;
      }

      // Check if already preloading this property
      if (preloadingRooms.current.has(propertyId)) {
        console.log('Already preloading chat room for property:', propertyId);
        return null;
      }

      preloadingRooms.current.add(propertyId);
      console.log('Preloading chat room for property:', propertyId);
      
      // Get current user ID if not provided
      let currentUserId = userId;
      if (!currentUserId) {
        try {
          const userResponse = await fetch(`${apiUrl}/api/v1/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (userResponse.ok) {
            const userData = await userResponse.json();
            currentUserId = userData.id;
          }
        } catch (error) {
          console.warn('Failed to get current user for preloading:', error);
          return null;
        }
      }

      // Try to create or get the chat room using fast endpoint
      const response = await fetch(`${apiUrl}/api/v1/fast/chat/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          property_id: propertyId,
          created_by: currentUserId,
          name: `Property Chat` // Backend will create a better name using agent and property data
        })
      });

      if (response.ok) {
        const chatRoom = await response.json();
        
        // Add to cached chat rooms
        setChatRooms(prev => {
          const updated = [...prev, chatRoom];
          saveChatRoomsToCache(updated);
          return updated;
        });
        
        console.log('Chat room preloaded successfully:', chatRoom.id);
        return chatRoom;
      } else {
        console.warn('Failed to preload chat room:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error preloading chat room:', error);
      return null;
    } finally {
      preloadingRooms.current.delete(propertyId);
    }
  };

  const preloadChatRoomsForProperties = async (properties: Property[], userId: string): Promise<void> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No authentication token found for batch preloading');
        return;
      }

      // Filter properties that don't already have cached chat rooms
      const propertiesToPreload = properties.filter(property => 
        !getChatRoomByPropertyId(property.id)
      );

      if (propertiesToPreload.length === 0) {
        console.log('All properties already have cached chat rooms');
        return;
      }

      console.log(`Preloading chat rooms for ${propertiesToPreload.length} properties`);

      // Preload chat rooms in batches to avoid overwhelming the server
      const batchSize = 3;
      for (let i = 0; i < propertiesToPreload.length; i += batchSize) {
        const batch = propertiesToPreload.slice(i, i + batchSize);
        
        const preloadPromises = batch.map(async (property) => {
          try {
            await preloadChatRoom(property.id, userId, property.owner_id);
          } catch (error) {
            console.warn(`Failed to preload chat room for property ${property.id}:`, error);
          }
        });

        await Promise.allSettled(preloadPromises);
        
        // Small delay between batches to be gentle on the server
        if (i + batchSize < propertiesToPreload.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log('Batch preloading completed');
    } catch (error) {
      console.error('Error in batch preloading:', error);
    }
  };

  const isDataStale = useCallback((): boolean => {
    if (!lastUpdated) return true;
    return Date.now() - lastUpdated > CACHE_DURATION;
  }, [lastUpdated]);

  // Auto-refresh data if it becomes stale (when user becomes active)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isDataStale()) {
        console.log('Data is stale, refreshing...');
        preloadData();
      }
    };

    const handleFocus = () => {
      if (isDataStale()) {
        console.log('Window focused and data is stale, refreshing...');
        preloadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [lastUpdated, isDataStale, preloadData]);

  // Sent messages tracking functions
  const hasSentMessageToProperty = useCallback((propertyId: string): boolean => {
    try {
      const cachedData = localStorage.getItem(SENT_MESSAGES_KEY);
      if (cachedData) {
        const parsed: SentMessagesCache = JSON.parse(cachedData);
        // Convert Set back from array (since JSON doesn't support Set)
        const sentPropertyIds = new Set(parsed.sentPropertyIds);
        return sentPropertyIds.has(propertyId);
      }
    } catch (error) {
      console.error('Error checking sent messages cache:', error);
    }
    return false;
  }, []);

  const markMessageSentToProperty = useCallback((propertyId: string): void => {
    try {
      const cachedData = localStorage.getItem(SENT_MESSAGES_KEY);
      let sentPropertyIds = new Set<string>();
      
      if (cachedData) {
        const parsed: SentMessagesCache = JSON.parse(cachedData);
        sentPropertyIds = new Set(parsed.sentPropertyIds);
      }
      
      sentPropertyIds.add(propertyId);
      
      const cacheData: SentMessagesCache = {
        sentPropertyIds: Array.from(sentPropertyIds), // Convert Set to array for JSON
        timestamp: Date.now()
      };
      
      localStorage.setItem(SENT_MESSAGES_KEY, JSON.stringify(cacheData));
      console.log(`📝 [CACHE] Marked message sent for property: ${propertyId}`);
    } catch (error) {
      console.error('Error saving sent messages cache:', error);
    }
  }, []);

  const removeMessageSentToProperty = useCallback((propertyId: string): void => {
    try {
      const cachedData = localStorage.getItem(SENT_MESSAGES_KEY);
      if (cachedData) {
        const parsed: SentMessagesCache = JSON.parse(cachedData);
        const sentPropertyIds = new Set(parsed.sentPropertyIds);
        
        // Remove the property from the set
        sentPropertyIds.delete(propertyId);
        
        const updatedCache: SentMessagesCache = {
          sentPropertyIds: Array.from(sentPropertyIds),
          timestamp: Date.now()
        };
        
        localStorage.setItem(SENT_MESSAGES_KEY, JSON.stringify(updatedCache));
        console.log(`🗑️ [CACHE] Removed message sent status for property: ${propertyId}`);
      }
    } catch (error) {
      console.error('Error removing property from sent messages cache:', error);
    }
  }, []);

  const removeChatRoomFromCache = useCallback((chatRoomId: string): void => {
    try {
      setChatRooms(prev => {
        const updated = prev.filter(room => room.id !== chatRoomId);
        saveChatRoomsToCache(updated);
        console.log(`🗑️ [CACHE] Removed chat room from cache: ${chatRoomId}`);
        return updated;
      });
    } catch (error) {
      console.error('Error removing chat room from cache:', error);
    }
  }, []);

  const removeChatRoomByPropertyId = useCallback((propertyId: string): void => {
    try {
      setChatRooms(prev => {
        const updated = prev.filter(room => room.property_id !== propertyId);
        saveChatRoomsToCache(updated);
        console.log(`🗑️ [CACHE] Removed chat room from cache for property: ${propertyId}`);
        return updated;
      });
    } catch (error) {
      console.error('Error removing chat room from cache by property ID:', error);
    }
  }, []);

  const addChatRoomToCache = useCallback((chatRoom: ChatRoom): void => {
    try {
      setChatRooms(prev => {
        // Check if room already exists, update if it does, otherwise add
        const exists = prev.some(room => room.id === chatRoom.id);
        if (exists) {
          const updated = prev.map(room => room.id === chatRoom.id ? { ...room, ...chatRoom } : room);
          saveChatRoomsToCache(updated);
          console.log(`📝 [CACHE] Updated existing chat room in cache: ${chatRoom.id}`);
          return updated;
        }
        
        const updated = [...prev, chatRoom];
        saveChatRoomsToCache(updated);
        console.log(`➕ [CACHE] Added chat room to cache: ${chatRoom.id}`);
        return updated;
      });
    } catch (error) {
      console.error('Error adding chat room to cache:', error);
    }
  }, []);

  const value: DataCacheContextType = {
    properties,
    featuredProperties,
    chatRooms,
    loading,
    error,
    lastUpdated,
    refreshData,
    getPropertyById,
    getPropertiesByType,
    getChatRoomByPropertyId,
    preloadChatRoom,
    preloadChatRoomsForProperties,
    removeChatRoomFromCache,
    removeChatRoomByPropertyId,
    addChatRoomToCache,
    isDataStale,
    hasSentMessageToProperty,
    markMessageSentToProperty,
    removeMessageSentToProperty
  };

  return (
    <DataCacheContext.Provider value={value}>
      {children}
    </DataCacheContext.Provider>
  );
};

export const useDataCache = (): DataCacheContextType => {
  const context = useContext(DataCacheContext);
  if (context === undefined) {
    throw new Error('useDataCache must be used within a DataCacheProvider');
  }
  return context;
};
