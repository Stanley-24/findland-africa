import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AgentProfileModal from '../agent/AgentProfileModal';
import OnboardingForm from '../OnboardingForm';
import PropertiesTab from './PropertiesTab';
import TradesTab from './TradesTab';
import ChatsTab from './ChatsTab';
import AnalysisTab from './AnalysisTab';
import FavoritesTab from './FavoritesTab';
import { BuyerDashboardProps, Property, Trade } from '../../types/buyerDashboard';
import { useDataCache } from '../../contexts/DataCacheContext';

const BuyerDashboard: React.FC<BuyerDashboardProps> = ({ user, apiUrl, onLogout, onCheckAgentApplication }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { removeMessageSentToProperty, removeChatRoomFromCache, chatRooms } = useDataCache();
  
  // State management
  const [properties, setProperties] = useState<Property[]>([]);
  const [applications, setApplications] = useState<Trade[]>([]);
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'properties' | 'trades' | 'chats' | 'analysis' | 'favorites'>('properties');
  const [favoriteProperties, setFavoriteProperties] = useState<Set<string>>(new Set());
  const [likedProperties, setLikedProperties] = useState<Set<string>>(new Set());
  
  // Calculate total unique properties in favorites tab (favorites + likes - duplicates)
  const totalFavoritesCount = favoriteProperties.size + likedProperties.size - 
    Array.from(favoriteProperties).filter(id => likedProperties.has(id)).length;
  
  // Modal states
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingType] = useState<'loan' | 'contact' | 'purchase'>('purchase');
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showAgentProfile, setShowAgentProfile] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<{ name: string; rating?: number; avatar?: string } | null>(null);

  const loadProperties = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
              const response = await axios.get(`${apiUrl}/api/v1/fast/properties`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProperties(response.data);
    } catch (err) {
      console.error('Error loading properties:', err);
    }
  }, [apiUrl]);


  const loadApplications = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${apiUrl}/api/v1/escrow/my-applications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApplications(response.data);
    } catch (err) {
      console.error('Error loading applications:', err);
      // Set empty array if endpoint doesn't exist or user has no applications
      setApplications([]);
    }
  }, [apiUrl]);

  // Chat rooms are now managed by DataCache context, no need for separate loading

  const loadData = useCallback(async () => {
    if (dataLoaded) return; // Prevent multiple simultaneous calls
    
    try {
      setLoading(true);
      setError(null);
      await Promise.all([
        loadProperties(),
        loadApplications(),
      ]);
      setDataLoaded(true);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [loadProperties, loadApplications, dataLoaded]);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Check favorite and like status for all properties when they load
  useEffect(() => {
    if (properties.length > 0) {
      properties.forEach(property => {
        checkFavoriteStatus(property.id);
        checkLikeStatus(property.id);
      });
    }
  }, [properties]); // eslint-disable-line react-hooks/exhaustive-deps


  // Re-check like status when returning to properties tab
  useEffect(() => {
    if (activeTab === 'properties' && properties.length > 0) {
      properties.forEach(property => {
        checkLikeStatus(property.id);
      });
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-check like status when window regains focus (user returns from property page)
  useEffect(() => {
    const handleFocus = () => {
      if (activeTab === 'properties' && properties.length > 0) {
        properties.forEach(property => {
          checkLikeStatus(property.id);
        });
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [activeTab, properties]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle URL parameters to set active tab
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['properties', 'trades', 'chats', 'analysis', 'favorites'].includes(tab)) {
      setActiveTab(tab as 'properties' | 'trades' | 'chats' | 'analysis' | 'favorites');
    }
  }, [searchParams]);

  // Helper function to handle tab changes and update URL
  const handleTabChange = (tab: 'properties' | 'trades' | 'chats' | 'analysis' | 'favorites') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Check favorite status for a property
  const checkFavoriteStatus = async (propertyId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`${apiUrl}/api/v1/favorites/${propertyId}/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.is_favorited) {
        setFavoriteProperties(prev => new Set([...Array.from(prev), propertyId]));
      }
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  // Check like status for a property
  const checkLikeStatus = async (propertyId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`${apiUrl}/api/v1/likes/${propertyId}/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.is_liked) {
        setLikedProperties(prev => new Set([...Array.from(prev), propertyId]));
      } else {
        // Remove from liked properties if not liked
        setLikedProperties(prev => {
          const newSet = new Set(prev);
          newSet.delete(propertyId);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  // Property management functions
  const toggleFavorite = async (propertyId: string) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        // Redirect to login if not authenticated
        navigate('/login');
        return;
      }

      const isFavorited = favoriteProperties.has(propertyId);

      if (isFavorited) {
        // Remove from favorites
        await axios.delete(`${apiUrl}/api/v1/favorites/${propertyId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setFavoriteProperties(prev => {
          const newSet = new Set(prev);
          newSet.delete(propertyId);
          return newSet;
        });
      } else {
        // Add to favorites
        await axios.post(`${apiUrl}/api/v1/favorites/${propertyId}`, {}, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setFavoriteProperties(prev => new Set([...Array.from(prev), propertyId]));
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      } else {
        alert('Failed to update favorites. Please try again.');
      }
    }
  };

  const toggleLike = async (propertyId: string) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        // Redirect to login if not authenticated
        navigate('/login');
        return;
      }

      const isLiked = likedProperties.has(propertyId);
      
      if (isLiked) {
        // Remove from likes
        await axios.delete(`${apiUrl}/api/v1/likes/${propertyId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setLikedProperties(prev => {
          const newSet = new Set(prev);
          newSet.delete(propertyId);
          return newSet;
        });
      } else {
        // Add to likes
        await axios.post(`${apiUrl}/api/v1/likes/${propertyId}`, {}, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setLikedProperties(prev => new Set([...Array.from(prev), propertyId]));
      }
    } catch (error: any) {
      console.error('Error toggling like:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      } else {
        alert('Failed to update likes. Please try again.');
      }
    }
  };

  const removeProperty = (propertyId: string) => {
    setProperties(prev => prev.filter(p => p.id !== propertyId));
  };

  const handleBuyProperty = (property: Property) => {
    setSelectedProperty(property);
    setShowBuyModal(true);
  };

  // Chat management functions
  const handleChatSelection = (chatId: string) => {
    setSelectedChats(prev => 
      prev.includes(chatId) 
        ? prev.filter(id => id !== chatId)
        : [...prev, chatId]
    );
  };

  const handleSelectAllChats = () => {
    setSelectedChats(prev => 
      prev.length === chatRooms.length ? [] : chatRooms.map(chat => chat.id)
    );
  };

  const handleBatchDeleteChats = async () => {
    try {
      const token = localStorage.getItem('token');
      const deleteResults = await Promise.allSettled(
        selectedChats.map(chatId => 
          axios.delete(`${apiUrl}/api/v1/fast/chat/rooms/${chatId}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        )
      );
      
      // Track successful and failed deletions
      const successfulDeletions: string[] = [];
      const failedDeletions: string[] = [];
      
      deleteResults.forEach((result, index) => {
        const chatId = selectedChats[index];
        if (result.status === 'fulfilled') {
          successfulDeletions.push(chatId);
        } else {
          failedDeletions.push(chatId);
          console.warn(`Failed to delete chat ${chatId}:`, result.reason?.response?.status, result.reason?.response?.data?.detail);
        }
      });
      
      // Remove successfully deleted chats and update sent messages cache
      if (successfulDeletions.length > 0) {
        // Remove properties from sent messages cache for deleted chats
        successfulDeletions.forEach(chatId => {
          const deletedChat = chatRooms.find(chat => chat.id === chatId);
          if (deletedChat && deletedChat.property_id) {
            removeMessageSentToProperty(deletedChat.property_id);
          }
          // Remove chat room from cache
          removeChatRoomFromCache(chatId);
        });
        
        // Chat rooms are managed by DataCache, no need to update local state
      }
      
      // Clear selection
      setSelectedChats([]);

      // Show user feedback if some deletions failed
      if (failedDeletions.length > 0) {
        console.warn(`${failedDeletions.length} chat(s) could not be deleted. You may not have permission to delete them.`);
      }
      
    } catch (err) {
      console.error('Error deleting chats:', err);
    }
  };

  const handleDeleteSingleChat = async (chatId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${apiUrl}/api/v1/fast/chat/rooms/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Find the chat room to get its property_id before removing it
      const deletedChat = chatRooms.find(chat => chat.id === chatId);
      if (deletedChat && deletedChat.property_id) {
        removeMessageSentToProperty(deletedChat.property_id);
      }
      
      // Remove chat room from cache
      removeChatRoomFromCache(chatId);
      
      // Chat rooms are managed by DataCache, no need to update local state
      setSelectedChats(prev => prev.filter(id => id !== chatId));
    } catch (err: any) {
      console.error('Error deleting chat:', err);
      
      // Handle specific error cases
      if (err.response?.status === 403) {
        console.warn('You do not have permission to delete this chat room');
      } else if (err.response?.status === 404) {
        console.warn('Chat room not found - it may have already been deleted');
        // Find the chat room to get its property_id before removing it
        const deletedChat = chatRooms.find(chat => chat.id === chatId);
        if (deletedChat && deletedChat.property_id) {
          removeMessageSentToProperty(deletedChat.property_id);
        }
        
        // Remove chat room from cache
        removeChatRoomFromCache(chatId);
        
        // Chat rooms are managed by DataCache, no need to update local state
        // Remove from selection if it's a 404 (already deleted)
        setSelectedChats(prev => prev.filter(id => id !== chatId));
      }
    }
  };

  const handleAgentProfileClick = (name: string, rating?: number, avatar?: string) => {
    setSelectedAgent({ name, rating, avatar });
    setShowAgentProfile(true);
  };

  // Onboarding functions
  const handleOnboardingSubmit = async (data: any) => {
    try {
      // Handle onboarding submission
      console.log('Onboarding data:', data);
      setShowOnboarding(false);
    } catch (err) {
      console.error('Error submitting onboarding:', err);
    }
  };

  // Retry function
  const retryLoadData = () => {
    setDataLoaded(false);
    setError(null);
    loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={retryLoadData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 font-heading">Buyer Dashboard</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-gray-700 text-sm sm:text-base font-medium hidden sm:inline font-body">
                  Welcome, {user.name}!
                </span>
                <span className="text-gray-700 text-sm font-medium sm:hidden font-body">
                  Hi, {user.name.split(' ')[0]}!
                </span>
              </div>
              <button
                onClick={onLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-sm sm:text-base"
              >
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">Exit</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-4 sm:mb-6">
            <nav className="-mb-px flex space-x-4 sm:space-x-6 lg:space-x-8 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => handleTabChange('properties')}
                className={`tab-enhanced ${
                  activeTab === 'properties' ? 'active' : ''
                }`}
              >
                <span className="hidden sm:inline font-body">Properties</span>
                <span className="sm:hidden font-body">Props</span>
              </button>
              <button
                onClick={() => handleTabChange('trades')}
                className={`tab-enhanced ${
                  activeTab === 'trades' ? 'active' : ''
                }`}
              >
                <span className="font-body">Trades</span>
              </button>
              <button
                onClick={() => handleTabChange('chats')}
                className={`tab-enhanced ${
                  activeTab === 'chats' ? 'active' : ''
                }`}
              >
                <span className="font-body">Chats</span>
              </button>
              <button
                onClick={() => handleTabChange('analysis')}
                className={`tab-enhanced ${
                  activeTab === 'analysis' ? 'active' : ''
                }`}
              >
                <span className="hidden sm:inline font-body">Analysis</span>
                <span className="sm:hidden font-body">Stats</span>
              </button>
                    <button
                onClick={() => handleTabChange('favorites')}
                className={`tab-enhanced ${
                  activeTab === 'favorites' ? 'active' : ''
                }`}
              >
                {/* Heart Icon */}
                <svg 
                  className="w-4 h-4 transition-all duration-200" 
                  fill={totalFavoritesCount > 0 ? "currentColor" : "none"} 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                  />
                </svg>
                <span className="hidden sm:inline font-body">Favorites</span>
                <span className="sm:hidden font-body">Likes</span>
                {totalFavoritesCount > 0 && (
                  <span className="count-badge">
                    {totalFavoritesCount}
                  </span>
                )}
                    </button>
            </nav>
            </div>

        {/* Tab Content */}
        {activeTab === 'properties' && (
          <PropertiesTab
            user={user}
            apiUrl={apiUrl}
            onLogout={onLogout}
            onCheckAgentApplication={onCheckAgentApplication}
            properties={properties}
            favoriteProperties={Array.from(favoriteProperties)}
            likedProperties={Array.from(likedProperties)}
            onToggleFavorite={toggleFavorite}
            onToggleLike={toggleLike}
            onRemoveProperty={removeProperty}
            onBuyProperty={handleBuyProperty}
          />
        )}

        {activeTab === 'trades' && (
          <TradesTab
            user={user}
            apiUrl={apiUrl}
            onLogout={onLogout}
            onCheckAgentApplication={onCheckAgentApplication}
            applications={applications}
          />
        )}

        {activeTab === 'chats' && (
          <ChatsTab
            user={user}
            apiUrl={apiUrl}
            onLogout={onLogout}
            onCheckAgentApplication={onCheckAgentApplication}
            chatRooms={chatRooms}
            selectedChats={selectedChats}
            onChatSelection={handleChatSelection}
            onSelectAllChats={handleSelectAllChats}
            onBatchDeleteChats={handleBatchDeleteChats}
            onDeleteSingleChat={handleDeleteSingleChat}
            onAgentProfileClick={handleAgentProfileClick}
          />
        )}

        {activeTab === 'analysis' && (
          <AnalysisTab
            user={user}
            apiUrl={apiUrl}
            onLogout={onLogout}
            onCheckAgentApplication={onCheckAgentApplication}
          />
        )}

        {activeTab === 'favorites' && (
          <FavoritesTab
            apiUrl={apiUrl}
            likedProperties={likedProperties}
            onLikeUpdate={(propertyId: string, isLiked: boolean) => {
              if (isLiked) {
                setLikedProperties(prev => new Set([...Array.from(prev), propertyId]));
              } else {
                setLikedProperties(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(propertyId);
                  return newSet;
                });
              }
            }}
          />
        )}
                        </div>

      {/* Modals */}
      <OnboardingForm
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onSubmit={handleOnboardingSubmit}
        type={onboardingType}
        propertyTitle="General Property Inquiry"
      />

      {showBuyModal && selectedProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Purchase</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to buy "{selectedProperty.title}" for {new Intl.NumberFormat('en-NG', {
                style: 'currency',
                currency: 'NGN',
                minimumFractionDigits: 0,
              }).format(selectedProperty.price)}?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowBuyModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Handle purchase logic
                  setShowBuyModal(false);
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Confirm Purchase
              </button>
            </div>
          </div>
        </div>
      )}

      {showAgentProfile && selectedAgent && (
      <AgentProfileModal
          isOpen={showAgentProfile}
          onClose={() => setShowAgentProfile(false)}
          agentName={selectedAgent.name}
          agentRating={selectedAgent.rating}
          agentAvatar={selectedAgent.avatar}
        apiUrl={apiUrl}
      />
      )}
    </div>
  );
};

export default BuyerDashboard;
