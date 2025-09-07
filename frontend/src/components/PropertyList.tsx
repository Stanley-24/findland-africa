import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import OnboardingForm from './OnboardingForm';
import { saveUserIntent } from '../utils/userIntent';
import { useDataCache } from '../contexts/DataCacheContext';

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

interface PropertyListProps {
  apiUrl: string;
}

interface OnboardingData {
  fullName: string;
  email: string;
  phone: string;
  purpose: string;
  budget?: number;
  timeline: string;
  additionalInfo: string;
  agreeToTerms: boolean;
}

const PropertyList: React.FC<PropertyListProps> = ({ apiUrl }) => {
  const { properties: cachedProperties, loading: cacheLoading } = useDataCache();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedImageIndex, setSelectedImageIndex] = useState<Record<string, number>>({});
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [favoriteProperties, setFavoriteProperties] = useState<Set<string>>(new Set());
  const [favoriteLoading, setFavoriteLoading] = useState<Set<string>>(new Set());

  const filterCachedProperties = useCallback(() => {
    if (!cachedProperties) return;
    
    let filteredProperties = [...cachedProperties];
    
    // Get URL parameters
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    
    // Filter by type
    if (type && type !== 'all') {
      if (type === 'buy') {
        filteredProperties = filteredProperties.filter(p => p.type === 'sale');
      } else if (type === 'rent') {
        filteredProperties = filteredProperties.filter(p => p.type === 'rent');
      } else if (type === 'land') {
        filteredProperties = filteredProperties.filter(p => p.type === 'land');
      }
    }
    
    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      filteredProperties = filteredProperties.filter(p => 
        p.title.toLowerCase().includes(searchLower) ||
        p.location.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      );
    }
    
    setProperties(filteredProperties);
    setLoading(false);
    setError(null);
  }, [cachedProperties, searchParams]);

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get URL parameters
      const type = searchParams.get('type');
      const search = searchParams.get('search');
      
      // Build query parameters
      const params = new URLSearchParams();
      if (type && type !== 'all') {
        // Map frontend types to backend types
        if (type === 'buy') {
          params.set('type', 'sale');
        } else if (type === 'rent') {
          params.set('type', 'rent');
        } else if (type === 'land') {
          params.set('type', 'land');
        }
      }
      if (search) {
        params.set('location', search);
      }
      
      const queryString = params.toString();
      const url = `${apiUrl}/api/v1/properties/${queryString ? `?${queryString}` : ''}`;
      
      const response = await axios.get(url);
      setProperties(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch properties');
      console.error('Error fetching properties:', err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, searchParams]);

  // Use cached data with smart filtering
  useEffect(() => {
    if (cachedProperties && cachedProperties.length > 0) {
      filterCachedProperties();
    } else if (!cacheLoading) {
      // Fallback to API if no cached data
      fetchProperties();
    }
  }, [cachedProperties, cacheLoading, searchParams, filterCachedProperties, fetchProperties]);

  // Check favorite status for all properties when they load
  useEffect(() => {
    if (properties.length > 0) {
      properties.forEach(property => {
        checkFavoriteStatus(property.id);
      });
    }
  }, [properties]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'sold':
      case 'rented':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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

  // Toggle favorite status
  const handleToggleFavorite = async (propertyId: string) => {
    try {
      setFavoriteLoading(prev => new Set([...Array.from(prev), propertyId]));
      const token = localStorage.getItem('token');
      
      if (!token) {
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
    } finally {
      setFavoriteLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(propertyId);
        return newSet;
      });
    }
  };

  const getPropertyTypeColor = (type: string) => {
    switch (type) {
      case 'sale': return 'bg-green-100 text-green-800';
      case 'rent': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCurrentImageIndex = (propertyId: string) => {
    return selectedImageIndex[propertyId] || 0;
  };

  const setCurrentImageIndex = (propertyId: string, index: number) => {
    setSelectedImageIndex(prev => ({ ...prev, [propertyId]: index }));
  };

  const navigateImage = (propertyId: string, direction: 'prev' | 'next', totalImages: number) => {
    const currentIndex = getCurrentImageIndex(propertyId);
    let newIndex;
    
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : totalImages - 1;
    } else {
      newIndex = currentIndex < totalImages - 1 ? currentIndex + 1 : 0;
    }
    
    setCurrentImageIndex(propertyId, newIndex);
  };

  const handleOnboardingSubmit = async (data: OnboardingData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login to continue');
        return;
      }

      if (!selectedProperty) {
        alert('Property not found');
        return;
      }

      // Create chat room for this property with user information
      const response = await fetch(`${apiUrl}/api/v1/fast/chat/rooms`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          property_id: selectedProperty.id,
          created_by: JSON.parse(localStorage.getItem('user') || '{}').id,
          name: `Chat about ${selectedProperty.title}`
        })
      });

      if (response.ok) {
        const newChatRoom = await response.json();
        alert('Contact request submitted successfully! The property owner will get in touch with you soon.');
        window.open(`/chat/${newChatRoom.id}`, '_blank');
      } else {
        alert('Failed to submit contact request. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting contact request:', error);
      alert('Error submitting contact request. Please try again.');
    }
  };

  const handleContactClick = (property: Property) => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      // Save user intent and redirect to login page
      saveUserIntent({
        action: 'chat',
        property_id: property.id,
        property_title: property.title,
        timestamp: Date.now()
      });
      navigate('/login');
      return;
    }
    setSelectedProperty(property);
    setShowOnboarding(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading properties...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={fetchProperties}
                    className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Back Button */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 hover:text-blue-600 mb-4 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </button>

          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {(() => {
                  const type = searchParams.get('type');
                  const search = searchParams.get('search');
                  if (type === 'buy') return 'Properties for Sale';
                  if (type === 'rent') return 'Properties for Rent';
                  if (type === 'land') return 'Land for Sale';
                  if (search) return `Properties in ${search}`;
                  return 'All Property Listings';
                })()}
              </h2>
              <p className="text-gray-600 mt-1">
                {properties.length} {properties.length === 1 ? 'property' : 'properties'} found
              </p>
            </div>
            <button
              onClick={fetchProperties}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>

      {properties.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No properties found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new property listing.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <div key={property.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              {/* Property Image Gallery */}
              <div className="relative h-48 bg-gradient-to-br from-blue-100 to-blue-200 group">
                {property.media && property.media.length > 0 ? (
                  <img
                    src={property.media[getCurrentImageIndex(property.id)]?.url || property.media[0].url}
                    alt={property.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                      </div>
                      <p className="text-blue-600 text-sm font-medium">No Image</p>
                    </div>
                  </div>
                )}
                
                {/* Image Navigation Arrows */}
                {property.media && property.media.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateImage(property.id, 'prev', property.media!.length);
                      }}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1.5 rounded-full hover:bg-opacity-70 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateImage(property.id, 'next', property.media!.length);
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1.5 rounded-full hover:bg-opacity-70 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}

                {/* Image Counter */}
                {property.media && property.media.length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-xs">
                    {getCurrentImageIndex(property.id) + 1} / {property.media.length}
                  </div>
                )}
                
                {/* Property Type Badge */}
                <div className="absolute top-3 left-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPropertyTypeColor(property.type)}`}>
                    {property.type.charAt(0).toUpperCase() + property.type.slice(1)}
                  </span>
                </div>
                
                {/* Status Badge and Favorite Button */}
                <div className="absolute top-3 right-3 flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(property.status)}`}>
                    {property.status}
                  </span>
                  
                  {/* Favorite Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(property.id);
                    }}
                    disabled={favoriteLoading.has(property.id)}
                    className={`p-2 rounded-full transition-colors ${
                      favoriteProperties.has(property.id) 
                        ? 'bg-red-500 text-white' 
                        : 'bg-white bg-opacity-80 text-gray-600 hover:bg-opacity-100'
                    }`}
                  >
                    {favoriteLoading.has(property.id) ? (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                    ) : (
                      <svg 
                        className="w-4 h-4" 
                        fill={favoriteProperties.has(property.id) ? 'currentColor' : 'none'} 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    )}
                  </button>
                </div>
                
                {/* Price Overlay */}
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-lg px-3 py-2">
                    <div className="text-lg font-bold text-green-600">
                      {formatPrice(property.price)}
                    </div>
                    <div className="text-xs text-gray-600">
                      {property.type === 'rent' ? 'per month' : 'total price'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Thumbnail Gallery */}
              {property.media && property.media.length > 1 && (
                <div className="px-3 py-2 bg-gray-50">
                  <div className="flex space-x-1 overflow-x-auto">
                    {property.media.map((media, index) => (
                      <button
                        key={media.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex(property.id, index);
                        }}
                        className={`flex-shrink-0 w-12 h-8 rounded overflow-hidden border transition-all ${
                          index === getCurrentImageIndex(property.id) 
                            ? 'border-blue-500 ring-1 ring-blue-200' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={media.url}
                          alt={`${property.title} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Property Details */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                  {property.title}
                </h3>
                
                <div className="flex items-center text-gray-600 mb-3">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm truncate">{property.location}</span>
                </div>
                
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {property.description || 'No description available'}
                </p>
                
                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <span>Listed: {new Date(property.created_at).toLocaleDateString()}</span>
                  <div className="flex items-center">
                    <svg className="w-3 h-3 text-green-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Verified</span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Link
                    to={`/property/${property.id}`}
                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors text-center"
                  >
                    View Details
                  </Link>
                  <button 
                    onClick={() => handleContactClick(property)}
                    className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                    title={!localStorage.getItem('token') ? 'Login required to contact owner' : 'Contact property owner'}
                  >
                    Contact
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
        </div>
      </div>

      {/* Onboarding Form Modal */}
      <OnboardingForm
        isOpen={showOnboarding}
        onClose={() => {
          setShowOnboarding(false);
          setSelectedProperty(null);
        }}
        onSubmit={handleOnboardingSubmit}
        type="contact"
        propertyTitle={selectedProperty?.title}
      />
    </div>
  );
};

export default PropertyList;
