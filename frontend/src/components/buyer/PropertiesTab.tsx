import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Property, TabComponentProps } from '../../types/buyerDashboard';
import { useDataCache } from '../../contexts/DataCacheContext';
import { formatPrice } from '../../utils/textUtils';
import LoadingSpinner from '../common/LoadingSpinner';

interface PropertiesTabProps extends TabComponentProps {
  properties: Property[];
  favoriteProperties: string[];
  likedProperties: string[];
  onToggleFavorite: (propertyId: string) => void;
  onToggleLike: (propertyId: string) => void;
  onRemoveProperty: (propertyId: string) => void;
  onBuyProperty: (property: Property) => void;
}

const PropertiesTab: React.FC<PropertiesTabProps> = ({
  user,
  apiUrl,
  onLogout,
  onCheckAgentApplication,
  properties,
  favoriteProperties,
  likedProperties,
  onToggleFavorite,
  onToggleLike,
  onRemoveProperty,
  onBuyProperty,
}) => {
  const [propertyFilter, setPropertyFilter] = useState<'all' | 'sale' | 'rent'>('all');
  const [chatLoading, setChatLoading] = useState<string | null>(null); // Track which property is loading
  const navigate = useNavigate();
  const { getChatRoomByPropertyId, hasSentMessageToProperty } = useDataCache();
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hover-based preloading with debouncing - ONLY CACHE, NO MESSAGE SENDING
  const handlePropertyHover = useCallback((property: Property) => {
    // No longer preloading chat rooms on hover to prevent empty chat room creation
    // Chat rooms will only be created when user actually clicks the chat button
    console.log('🔄 [CACHE] Property hovered:', property.title, '- No chat room preloading');
  }, []);

  const handlePropertyLeave = useCallback(() => {
    // Clear timeout when user stops hovering
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Using shared formatPrice utility

  const getFilteredProperties = (): Property[] => {
    if (propertyFilter === 'all') return properties;
    return properties.filter(property => property.type === propertyFilter);
  };

  const toggleFavorite = (propertyId: string) => {
    onToggleFavorite(propertyId);
  };

  const toggleLike = (propertyId: string) => {
    onToggleLike(propertyId);
  };

  const removeProperty = (propertyId: string) => {
    onRemoveProperty(propertyId);
  };

  const handleBuyProperty = (property: Property) => {
    onBuyProperty(property);
  };

  return (
    <div>
      {/* Property Management Header */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Properties</h2>
              <p className="text-sm text-gray-600">
                <span className="hidden sm:inline">Browse and discover properties for sale and rent</span>
                <span className="sm:hidden">Browse properties for sale and rent</span>
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPropertyFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  propertyFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setPropertyFilter('sale')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  propertyFilter === 'sale'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <span className="hidden sm:inline">For Sale</span>
                <span className="sm:hidden">Sale</span>
              </button>
              <button
                onClick={() => setPropertyFilter('rent')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  propertyFilter === 'rent'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <span className="hidden sm:inline">For Rent</span>
                <span className="sm:hidden">Rent</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Properties Grid */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          {getFilteredProperties().length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-20 h-20 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No Properties Found</h3>
              <p className="text-gray-600 mb-6">
                {propertyFilter === 'all' 
                  ? 'There are no properties available at the moment.'
                  : `There are no properties for ${propertyFilter} at the moment.`
                }
              </p>
              <button
                onClick={() => setPropertyFilter('all')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                View All Properties
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getFilteredProperties().map((property) => (
                <div 
                  key={property.id} 
                  className="bg-gray-50 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/property/${property.id}`)}
                  onMouseEnter={() => handlePropertyHover(property)}
                  onMouseLeave={handlePropertyLeave}
                >
                  <div className="relative">
                    {property.media && property.media.length > 0 ? (
                      <img
                        src={property.media[0].url}
                        alt={property.title}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                    )}
                    
                    {/* Property Actions Overlay */}
                    <div className="absolute top-2 right-2 flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(property.id);
                        }}
                        className={`p-2 rounded-full ${likedProperties.includes(property.id) ? 'bg-red-500' : 'bg-white bg-opacity-80'} hover:bg-opacity-100 transition-colors`}
                      >
                        <svg className={`w-4 h-4 ${likedProperties.includes(property.id) ? 'text-white' : 'text-gray-600'}`} fill={likedProperties.includes(property.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(property.id);
                        }}
                        className={`p-2 rounded-full ${favoriteProperties.includes(property.id) ? 'bg-yellow-500' : 'bg-white bg-opacity-80'} hover:bg-opacity-100 transition-colors`}
                      >
                        <svg className={`w-4 h-4 ${favoriteProperties.includes(property.id) ? 'text-white' : 'text-gray-600'}`} fill={favoriteProperties.includes(property.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeProperty(property.id);
                        }}
                        className="p-2 rounded-full bg-white bg-opacity-80 hover:bg-opacity-100 transition-colors"
                      >
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm">{property.title}</h3>
                      <div className="flex space-x-1">
                        {favoriteProperties.includes(property.id) && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">Favorited</span>
                        )}
                        {likedProperties.includes(property.id) && (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">Liked</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Agent Verification */}
                    {property.agent_verification?.verified && (
                      <div className="mb-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Verified Agent
                          {property.agent_verification.rating && (
                            <span className="ml-1">⭐ {property.agent_verification.rating}</span>
                          )}
                        </span>
                      </div>
                    )}
                    <p className="text-gray-600 text-xs mb-3">{property.location}</p>
                    
                    {/* Neighborhood Insights */}
                    {property.neighborhood_insights && (
                      <div className="mb-3">
                        <div className="flex flex-wrap gap-1">
                          {property.neighborhood_insights.crime_rate && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              property.neighborhood_insights.crime_rate === 'low' ? 'bg-green-100 text-green-800' :
                              property.neighborhood_insights.crime_rate === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              🛡️ {property.neighborhood_insights.crime_rate} crime
                            </span>
                          )}
                          {property.neighborhood_insights.school_rating && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              🎓 Schools: {property.neighborhood_insights.school_rating}/10
                            </span>
                          )}
                          {property.neighborhood_insights.walkability_score && (
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                              🚶 Walkability: {property.neighborhood_insights.walkability_score}/100
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Transaction History */}
                    {property.transaction_history && (
                      <div className="mb-3">
                        <div className="flex items-center space-x-2 text-xs text-gray-600">
                          {property.transaction_history.price_trend && (
                            <span className={`flex items-center ${
                              property.transaction_history.price_trend === 'increasing' ? 'text-green-600' :
                              property.transaction_history.price_trend === 'decreasing' ? 'text-red-600' :
                              'text-gray-600'
                            }`}>
                              {property.transaction_history.price_trend === 'increasing' ? '📈' :
                               property.transaction_history.price_trend === 'decreasing' ? '📉' : '➡️'}
                              <span className="ml-1 capitalize">{property.transaction_history.price_trend}</span>
                            </span>
                          )}
                          {property.transaction_history.days_on_market && (
                            <span className="text-gray-500">
                              {property.transaction_history.days_on_market} days on market
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-blue-600">
                        {formatPrice(property.price)}
                      </span>
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBuyProperty(property);
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                        >
                          Buy
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            
                            // Set loading state
                            setChatLoading(property.id);
                            
                            // Start performance timing
                            const startTime = performance.now();
                            console.log(`🚀 [PERF] Starting chat flow for property: ${property.title}`);
                            
                            try {
                              const token = localStorage.getItem('token');
                              if (!token) {
                                navigate('/login');
                                return;
                              }

                              // Add 1-second delay for loading spinner
                              await new Promise(resolve => setTimeout(resolve, 1000));

                              // Check if chat room is already cached
                              const chatRoom = getChatRoomByPropertyId(property.id);
                              
                              if (chatRoom) {
                                // Use cached chat room
                                const navigationTime = performance.now() - startTime;
                                console.log(`⚡ [PERF] Cached chat room found in ${navigationTime.toFixed(2)}ms - navigating instantly`);
                                
                                // Always prepare initial message - let the chat page decide if it should be sent
                                const propertyMessage = `I'm interested in this property: ${property.title} - ${property.location} (${formatPrice(property.price)})`;
                                console.log(`💬 [CHAT] Opening existing chat for property: ${property.title}`);
                                navigate(`/chat/${chatRoom.id}`, { 
                                  state: { 
                                    initialMessage: propertyMessage, // Always provide initial message
                                    propertyInfo: {
                                      id: property.id,
                                      title: property.title,
                                      location: property.location,
                                      price: property.price,
                                      type: property.type,
                                      owner_id: property.owner_id
                                    },
                                    performanceStartTime: startTime
                                  } 
                                });
                              } else {
                                // No cached room - create new one
                                const navigationTime = performance.now() - startTime;
                                console.log(`⚡ [PERF] No cached chat room - creating temp room and navigating in ${navigationTime.toFixed(2)}ms`);
                                
                                // Generate a temporary chat room ID for instant navigation
                                const tempChatRoomId = `temp_${property.id}_${Date.now()}`;
                                
                                // Always prepare initial message - let the chat page decide if it should be sent
                                const propertyMessage = `I'm interested in this property: ${property.title} - ${property.location} (${formatPrice(property.price)})`;
                                
                                // Navigate immediately with temp ID
                                navigate(`/chat/${tempChatRoomId}`, { 
                                  state: { 
                                    initialMessage: propertyMessage,
                                    propertyInfo: {
                                      id: property.id,
                                      title: property.title,
                                      location: property.location,
                                      price: property.price,
                                      type: property.type,
                                      owner_id: property.owner_id
                                    },
                                    isTemporary: true,
                                    createChatRoom: {
                                      property_id: property.id,
                                      created_by: user.id,
                                      name: `Property Chat` // Backend will create a better name using agent and property data
                                    },
                                    performanceStartTime: startTime
                                  } 
                                });
                                
                                // Don't create chat room in background - let the chat page handle creation when message is sent
                                console.log('💬 [CHAT] Chat room will be created when first message is sent');
                              }
                            } catch (error) {
                              console.error('Error creating chat room:', error);
                              // Final fallback to old behavior
                              const chatRoomId = `property_${property.id}`;
                              // Always prepare initial message - let the chat page decide if it should be sent
                              const propertyMessage = `I'm interested in this property: ${property.title} - ${property.location} (${formatPrice(property.price)})`;
                              navigate(`/chat/${chatRoomId}`, { 
                                state: { 
                                  initialMessage: propertyMessage,
                                  propertyInfo: {
                                    id: property.id,
                                    title: property.title,
                                    location: property.location,
                                    price: property.price,
                                    type: property.type,
                                    owner_id: property.owner_id
                                  }
                                } 
                              });
                            } finally {
                              // Clear loading state
                              setChatLoading(null);
                            }
                          }}
                          disabled={chatLoading === property.id}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            chatLoading === property.id
                              ? 'bg-gray-400 cursor-not-allowed'
                              : getChatRoomByPropertyId(property.id)
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {getChatRoomByPropertyId(property.id) ? 'View Chat' : 'Chat'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Page-level loading overlay */}
      {chatLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center space-y-4">
            <LoadingSpinner size="lg" />
            <p className="text-gray-700 font-medium">Opening chat...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertiesTab;
