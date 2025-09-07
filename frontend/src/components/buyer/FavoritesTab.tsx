import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import LoadingSpinner from '../common/LoadingSpinner';
import { formatPrice } from '../../utils/textUtils';

interface Property {
  id: string;
  title: string;
  description: string;
  type: string;
  price: number;
  location: string;
  status: string;
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

interface FavoritesTabProps {
  apiUrl: string;
  likedProperties?: Set<string>;
  onLikeUpdate?: (propertyId: string, isLiked: boolean) => void;
}

const FavoritesTab: React.FC<FavoritesTabProps> = ({ apiUrl, likedProperties, onLikeUpdate }) => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Property[]>([]);
  const [likes, setLikes] = useState<Property[]>([]);
  const [allLikes, setAllLikes] = useState<Property[]>([]); // Store all likes to check if favorites are also liked
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFavorites();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync with likedProperties from parent component
  useEffect(() => {
    if (likedProperties && allLikes.length > 0) {
      // Filter likes based on current likedProperties state
      const favoriteIds = new Set(favorites.map((fav: Property) => fav.id));
      const filteredLikes = allLikes.filter((like: Property) => 
        likedProperties.has(like.id) && !favoriteIds.has(like.id)
      );
      setLikes(filteredLikes);
    }
  }, [likedProperties, allLikes, favorites]);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to view your favorites');
        return;
      }

      // Fetch both favorites and likes
      const [favoritesResponse, likesResponse] = await Promise.all([
        axios.get(`${apiUrl}/api/v1/favorites/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        axios.get(`${apiUrl}/api/v1/likes/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ]);

      const favoritesData = favoritesResponse.data.favorites || [];
      const likesData = likesResponse.data.likes || [];
      
      // Store all likes for reference
      setAllLikes(likesData);
      
      // Filter out duplicates - if a property is both favorited and liked, only show it in favorites
      const favoriteIds = new Set(favoritesData.map((fav: Property) => fav.id));
      const filteredLikes = likesData.filter((like: Property) => !favoriteIds.has(like.id));
      
      setFavorites(favoritesData);
      setLikes(filteredLikes);
    } catch (err: any) {
      console.error('Error fetching favorites and likes:', err);
      if (err.response?.status === 401) {
        setError('Please log in to view your favorites');
      } else {
        setError('Failed to load favorites. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Using shared formatPrice utility

  // Helper function to check if a property is also liked
  const isPropertyAlsoLiked = (propertyId: string) => {
    return allLikes.some(like => like.id === propertyId);
  };

  const handlePropertyClick = (propertyId: string) => {
    navigate(`/properties/${propertyId}`);
  };

  const handleRemoveFavorite = async (propertyId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await axios.delete(`${apiUrl}/api/v1/favorites/${propertyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Remove from local state
      setFavorites(prev => prev.filter(prop => prop.id !== propertyId));
      
      // Notify parent component
      if (onLikeUpdate) {
        onLikeUpdate(propertyId, false);
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
      alert('Failed to remove from favorites. Please try again.');
    }
  };

  const handleRemoveLike = async (propertyId: string): Promise<void> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await axios.delete(`${apiUrl}/api/v1/likes/${propertyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Notify parent component FIRST
      if (onLikeUpdate) {
        onLikeUpdate(propertyId, false);
      }

      // Remove from local state
      setLikes(prev => prev.filter(prop => prop.id !== propertyId));
      setAllLikes(prev => prev.filter(prop => prop.id !== propertyId));
      
      // Wait a bit to ensure state updates are processed
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Error removing like:', error);
      alert('Failed to remove like. Please try again.');
      throw error; // Re-throw to handle in calling function
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Favorites</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchFavorites}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (favorites.length === 0 && likes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Favorites or Likes Yet</h3>
        <p className="text-gray-600 mb-4">Start exploring properties and add them to your favorites or likes!</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Browse Properties
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Favorites Section */}
      {favorites.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Your Favorites</h2>
            <span className="text-sm text-gray-500">{favorites.length} property{favorites.length !== 1 ? 'ies' : ''}</span>
          </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {favorites.map((property) => (
          <div
            key={property.id}
            className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 cursor-pointer"
            onClick={() => handlePropertyClick(property.id)}
          >
            {/* Property Image */}
            <div className="relative h-48 bg-gray-200">
              {property.media && property.media.length > 0 ? (
                <img
                  src={property.media[0].url}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              
              {/* Badges container */}
              <div className="absolute top-3 right-3 flex gap-2">
                {/* Liked indicator */}
                {isPropertyAlsoLiked(property.id) && (
                  <div className="p-2 bg-red-500 text-white rounded-full shadow-lg">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                
                {/* Remove from favorites button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFavorite(property.id);
                  }}
                  className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              {/* Property type badge */}
              <div className="absolute top-3 left-3 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                {property.type}
              </div>
            </div>

            {/* Property Details */}
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                {property.title}
              </h3>
              
              <div className="flex items-center text-gray-600 mb-2">
                <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm">{property.location}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-blue-600">
                  {formatPrice(property.price)}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  property.status === 'available' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {property.status}
                </span>
              </div>

              {property.agent_name && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Agent:</span> {property.agent_name}
                  </p>
                  {property.agent_rating && (
                    <div className="flex items-center mt-1">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-3 h-3 ${i < Math.floor(property.agent_rating || 0) ? 'text-yellow-400' : 'text-gray-300'}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="ml-1 text-xs text-gray-600">
                        {(property.agent_rating || 0).toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
          </div>
        </div>
      )}

      {/* Likes Section */}
      {likes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Your Likes</h2>
            <span className="text-sm text-gray-500">{likes.length} property{likes.length !== 1 ? 'ies' : ''}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {likes.map((property) => (
              <div
                key={property.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 cursor-pointer"
                onClick={() => handlePropertyClick(property.id)}
              >
                {/* Property Image */}
                <div className="relative h-48 bg-gray-200">
                  {property.media && property.media.length > 0 ? (
                    <img
                      src={property.media[0].url}
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Like Badge and Remove Button */}
                  <div className="absolute top-3 right-3 flex gap-2">
                    {/* Clickable Like Badge - removes like and navigates */}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await handleRemoveLike(property.id);
                          // Navigate to property page after removing like
                          setTimeout(() => {
                            navigate(`/properties/${property.id}`);
                          }, 200);
                        } catch (error) {
                          // If like removal fails, still navigate to property page
                          navigate(`/properties/${property.id}`);
                        }
                      }}
                      className="bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors cursor-pointer"
                      title="Remove like and view property"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {/* Remove from likes button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveLike(property.id);
                      }}
                      className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                      title="Remove like only"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Property Details */}
                <div className="p-4">
                  <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2">
                    {property.title}
                  </h3>
                  
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {property.description}
                  </p>
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-bold text-blue-600">
                      {formatPrice(property.price)}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      property.type === 'sale' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {property.type === 'sale' ? 'For Sale' : 'For Rent'}
                    </span>
                  </div>
                  
                  <div className="flex items-center text-gray-500 text-sm mb-3">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="line-clamp-1">{property.location}</span>
                  </div>
                  
                  {property.agent_name && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-sm text-gray-600">Agent: {property.agent_name}</span>
                      </div>
                      {property.agent_rating && (
                        <div className="flex items-center">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`w-3 h-3 ${
                                  i < Math.floor(property.agent_rating || 0) 
                                    ? 'text-yellow-400' 
                                    : 'text-gray-300'
                                }`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span className="ml-1 text-xs text-gray-600">
                            {(property.agent_rating || 0).toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FavoritesTab;
