import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import LoadingSpinner from './common/LoadingSpinner';
// import { getUserIntent, executeUserIntent, clearUserIntent } from '../utils/userIntent';

interface Property {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  type: string;
  price: number;
  location: string;
  status: string;
  agent_name?: string;
  agent_rating?: number | string;
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

interface PropertyDetailProps {
  apiUrl: string;
}

const PropertyDetail: React.FC<PropertyDetailProps> = ({ apiUrl }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProperty();
      checkFavoriteStatus();
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle user intent execution after property loads
  useEffect(() => {
    if (property && !loading) {
      const action = searchParams.get('action');
      if (action === 'chat') {
        setShowChatModal(true);
        // Clean up URL parameter
        navigate(`/properties/${property.id}`, { replace: true });
      } else if (action === 'buy') {
        setShowBuyModal(true);
        // Clean up URL parameter
        navigate(`/properties/${property.id}`, { replace: true });
      }
    }
  }, [property, loading, searchParams, navigate]);

  // Keyboard navigation for image gallery
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (showImageModal && property?.media && property.media.length > 1) {
        if (event.key === 'ArrowLeft') {
          prevImage();
        } else if (event.key === 'ArrowRight') {
          nextImage();
        } else if (event.key === 'Escape') {
          setShowImageModal(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showImageModal, property?.media]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProperty = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${apiUrl}/api/v1/fast/properties/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setProperty(response.data);
    } catch (err: any) {
      console.error('Error fetching property:', err);
      if (err.response?.status === 401) {
        // Handle authentication error
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if ((window as any).updateAuthState) {
          (window as any).updateAuthState();
        }
        navigate('/login');
      } else {
        setError('Failed to load property details');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleBuy = () => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      // Save user intent for buy action
      const userIntent = {
        action: 'buy',
        property_id: property?.id,
        property_title: property?.title,
        agent_name: property?.agent_name,
        agent_email: property?.agent_email,
        timestamp: Date.now()
      };
      localStorage.setItem('userIntent', JSON.stringify(userIntent));
      
      // Redirect to signup page
      navigate('/register');
      return;
    }
    setShowBuyModal(true);
  };

  const handleChat = () => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      // Save user intent for chat action
      const userIntent = {
        action: 'chat',
        property_id: property?.id,
        property_title: property?.title,
        agent_name: property?.agent_name,
        agent_email: property?.agent_email,
        timestamp: Date.now()
      };
      localStorage.setItem('userIntent', JSON.stringify(userIntent));
      
      // Redirect to signup page
      navigate('/register');
      return;
    }
    setShowChatModal(true);
  };

  const handleStartChat = async () => {
    if (!property) return;
    
    try {
      setChatLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Get current user info
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (!user.id) {
        console.error('User ID not found');
        navigate('/login');
        return;
      }

      // First, try to find existing chat room for this property
      const chatRoomsResponse = await fetch(`${apiUrl}/api/v1/fast/chat/rooms`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (chatRoomsResponse.ok) {
        const chatRooms = await chatRoomsResponse.json();
        const existingRoom = chatRooms.find((room: any) => room.property_id === property.id);
        
        if (existingRoom) {
          // Add half-second delay for loading spinner
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Navigate to existing chat room using actual chat room ID
          const propertyMessage = `I'm interested in this property: ${property.title} - ${property.location} (${formatPrice(property.price)})`;
          navigate(`/chat/${existingRoom.id}`, { 
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
              returnUrl: `/properties/${property.id}`
            } 
          });
          return;
        }
      }

      // If no existing room, create a new one
      const createResponse = await fetch(`${apiUrl}/api/v1/fast/chat/rooms`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          property_id: property.id,
          created_by: user.id,
          name: `Chat about ${property.title}`
        }),
      });

      if (createResponse.ok) {
        const newChatRoom = await createResponse.json();
        
        // Add half-second delay for loading spinner
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Navigate using actual chat room ID
        const propertyMessage = `I'm interested in this property: ${property.title} - ${property.location} (${formatPrice(property.price)})`;
        navigate(`/chat/${newChatRoom.id}`, { 
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
            returnUrl: `/properties/${property.id}`
          } 
        });
      } else {
        console.error('Failed to create chat room');
        alert('Failed to start chat. Please try again.');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      alert('Failed to start chat. Please try again.');
    } finally {
      setChatLoading(false);
    }
  };

  const nextImage = () => {
    if (property?.media && property.media.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % property.media!.length);
    }
  };

  const prevImage = () => {
    if (property?.media && property.media.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + property.media!.length) % property.media!.length);
    }
  };

  const openImageModal = (index: number) => {
    setCurrentImageIndex(index);
    setShowImageModal(true);
  };

  const handleFlutterwavePayment = async () => {
    if (!property) return;

    try {
      // Here you would integrate with Flutterwave
      // For now, we'll just show a success message
      alert(`Redirecting to Flutterwave for payment of ${formatPrice(property.price)}`);
      setShowBuyModal(false);
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    }
  };

  const checkFavoriteStatus = async () => {
    if (!id) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsFavorited(false);
        return;
      }

      const response = await axios.get(`${apiUrl}/api/v1/favorites/${id}/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setIsFavorited(response.data.is_favorited);
    } catch (error) {
      console.error('Error checking favorite status:', error);
      setIsFavorited(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!property || !id) return;
    
    try {
      setFavoriteLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        // Redirect to login if not authenticated
        navigate('/login');
        return;
      }

      if (isFavorited) {
        // Remove from favorites
        await axios.delete(`${apiUrl}/api/v1/favorites/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setIsFavorited(false);
      } else {
        // Add to favorites
        await axios.post(`${apiUrl}/api/v1/favorites/${id}`, {}, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setIsFavorited(true);
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      } else {
        alert('Failed to update favorites. Please try again.');
      }
    } finally {
      setFavoriteLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Property Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The property you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Property Details</h1>
            <div></div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 order-1">
            {/* Property Image Gallery */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
              {property.media && property.media.length > 0 ? (
                <div className="relative group">
                  {/* Main Image */}
                  <div className="relative h-80 sm:h-96 lg:h-[500px] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                    <img
                      src={property.media[currentImageIndex].url}
                      alt={`${property.title} - ${currentImageIndex + 1}`}
                      className="w-full h-full object-cover cursor-pointer transition-all duration-500 group-hover:scale-105 group-hover:brightness-110"
                      onClick={() => openImageModal(currentImageIndex)}
                      loading="lazy"
                    />
                    
                    {/* Overlay gradient for better text visibility */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
                    
                    {/* Navigation Arrows */}
                    {property.media.length > 1 && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/95 backdrop-blur-sm text-gray-800 p-3 rounded-full shadow-xl hover:bg-white hover:scale-110 transition-all duration-300 opacity-0 group-hover:opacity-100 border border-gray-200"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/95 backdrop-blur-sm text-gray-800 p-3 rounded-full shadow-xl hover:bg-white hover:scale-110 transition-all duration-300 opacity-0 group-hover:opacity-100 border border-gray-200"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </>
                    )}
                    
                    {/* Image Counter */}
                    {property.media.length > 1 && (
                      <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                        {currentImageIndex + 1} / {property.media.length}
                      </div>
                    )}
                    
                    {/* Verified Badge */}
                    <div className="absolute top-4 left-4 bg-green-600 text-white px-3 py-2 rounded-full text-sm font-medium shadow-lg flex items-center">
                      <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Verified
                    </div>
                    
                    {/* Favorite Button */}
                    <button
                      onClick={handleToggleFavorite}
                      disabled={favoriteLoading}
                      className={`absolute top-4 right-16 p-3 rounded-full shadow-lg transition-all duration-300 ${
                        isFavorited 
                          ? 'bg-red-500 text-white hover:bg-red-600' 
                          : 'bg-white/90 text-gray-600 hover:bg-white hover:text-red-500'
                      } ${favoriteLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {favoriteLoading ? (
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg 
                          className={`w-5 h-5 transition-colors duration-200 ${
                            isFavorited ? 'fill-current' : 'stroke-current fill-none'
                          }`} 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                          />
                        </svg>
                      )}
                    </button>
                    
                    {/* Fullscreen indicator */}
                    <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg hover:bg-black/90">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Enhanced Thumbnail Gallery */}
                  {property.media.length > 1 && (
                    <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100">
                      <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
                        {property.media.map((media, index) => (
                          <button
                            key={media.id}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden border-4 transition-all duration-300 hover:scale-110 ${
                              index === currentImageIndex 
                                ? 'border-blue-500 ring-4 ring-blue-200 shadow-xl scale-105' 
                                : 'border-gray-200 hover:border-gray-300 shadow-lg hover:shadow-xl'
                            }`}
                          >
                            <img
                              src={media.url}
                              alt={`${property.title} thumbnail ${index + 1}`}
                              className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                              loading="lazy"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-80 sm:h-96 lg:h-[500px] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 text-lg font-medium">No images available</p>
                    <p className="text-gray-400 text-sm mt-1">Images will be added soon</p>
                  </div>
                </div>
              )}
            </div>

            {/* Property Details */}
            <div className="bg-white rounded-xl shadow-lg p-6 lg:p-8">
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 flex-1">{property.title}</h1>
                {/* Verified Badge */}
                <div className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium ml-4">
                  <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Verified
                </div>
              </div>
              <div className="flex items-center text-gray-600 mb-6">
                <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-lg">{property.location}</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-500">Type</p>
                    <p className="font-medium capitalize">{property.type}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="font-medium capitalize">{property.status}</p>
                  </div>
                </div>
              </div>

              {property.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                  <p className="text-gray-600 leading-relaxed">{property.description}</p>
                </div>
              )}

              <div className="border-t pt-6">
                <p className="text-sm text-gray-500 mb-2">Listed on</p>
                <p className="text-gray-900">{formatDate(property.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 order-2">
            {/* Price Card */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-2">Price</p>
                <p className="text-3xl font-bold text-blue-600 mb-6">{formatPrice(property.price)}</p>
                
                <div className="space-y-3">
                  <button
                    onClick={handleBuy}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Buy Now
                  </button>
                  <button
                    onClick={handleChat}
                    disabled={chatLoading}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Chat with Agent
                  </button>
                </div>
              </div>
            </div>

            {/* Agent Information */}
            {property.agent_name && (
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Information</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Agent Name</p>
                    <p className="font-medium">{property.agent_name}</p>
                  </div>
                  {property.agent_rating && (
                    <div>
                      <p className="text-sm text-gray-500">Rating</p>
                      <div className="flex items-center">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => {
                            const rating = typeof property.agent_rating === 'number' ? property.agent_rating : parseFloat(property.agent_rating || '0');
                            return (
                              <svg
                                key={i}
                                className={`w-4 h-4 ${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            );
                          })}
                        </div>
                        <span className="ml-2 text-sm text-gray-600">
                          {typeof property.agent_rating === 'number' ? property.agent_rating.toFixed(1) : property.agent_rating || '0.0'}
                        </span>
                      </div>
                    </div>
                  )}
                  {property.agent_phone && (
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium">{property.agent_phone}</p>
                    </div>
                  )}
                  {property.agent_email && (
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{property.agent_email}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Buy Modal */}
      {showBuyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-6">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Confirm Purchase</h3>
              </div>
            </div>
            <div className="mb-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-2">{property.title}</h4>
                <p className="text-sm text-gray-600 mb-2">{property.location}</p>
                <p className="text-lg font-bold text-green-600">{formatPrice(property.price)}</p>
              </div>
              <p className="text-sm text-gray-600">
                You are about to purchase this property. This will create an escrow transaction and redirect you to Flutterwave for secure payment processing.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowBuyModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleFlutterwavePayment}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {showChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-6">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Start Chat</h3>
              </div>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                Start a conversation with {property.agent_name || 'the property owner'} about this property.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowChatModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowChatModal(false);
                  await handleStartChat();
                }}
                disabled={chatLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Image Modal */}
      {showImageModal && property?.media && property.media.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-7xl max-h-full">
            {/* Close Button */}
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Navigation Arrows */}
            {property.media.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70 transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70 transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
            
            {/* Main Image */}
            <img
              src={property.media[currentImageIndex].url}
              alt={`${property.title} - ${currentImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
            
            {/* Image Counter */}
            {property.media.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-full text-sm">
                {currentImageIndex + 1} / {property.media.length}
              </div>
            )}
          </div>
        </div>
      )}

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

export default PropertyDetail;