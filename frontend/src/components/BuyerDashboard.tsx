import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import AgentProfileModal from './AgentProfileModal';
import OnboardingForm from './OnboardingForm';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface BuyerDashboardProps {
  user: User;
  apiUrl: string;
  onLogout: () => void;
}

interface Property {
  id: string;
  title: string;
  description: string;
  type: 'rent' | 'sale';
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

interface Application {
  id: string;
  property_id: string;
  property: {
    title: string;
    type: string;
    location: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  application_type: 'loan' | 'purchase' | 'contact';
  purpose: string;
  timeline: string;
  amount: number;
  created_at: string;
}

interface ChatRoom {
  id: string;
  property_id: string;
  property_title?: string;
  property_location?: string;
  agent_name?: string;
  agent_rating?: number;
  agent_avatar?: string;
  last_message_sender_avatar?: string;
  created_at: string;
  last_message_at: string;
  last_message?: {
    id: string;
    content: string;
    sender_name: string;
    created_at: string;
    updated_at?: string;
    is_edited?: boolean;
    is_deleted?: boolean;
  };
  status: 'active' | 'closed';
}

const BuyerDashboard: React.FC<BuyerDashboardProps> = ({ user, apiUrl, onLogout }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [recentProperties, setRecentProperties] = useState<Property[]>([]);
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'properties' | 'applications' | 'chats'>('properties');
  const [propertyFilter, setPropertyFilter] = useState<'all' | 'sale' | 'rent'>('all');
  const [favoriteProperties, setFavoriteProperties] = useState<string[]>([]);
  const [likedProperties, setLikedProperties] = useState<string[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingType] = useState<'contact' | 'purchase'>('contact');
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [agentProfileModal, setAgentProfileModal] = useState<{
    isOpen: boolean;
    agentName: string;
    agentRating?: number;
    agentAvatar?: string;
  }>({
    isOpen: false,
    agentName: '',
    agentRating: 0,
    agentAvatar: ''
  });

  useEffect(() => {
    fetchDashboardData();
  }, [apiUrl]); // eslint-disable-line react-hooks/exhaustive-deps


  // Handle tab parameter from URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['properties', 'applications', 'chats'].includes(tab)) {
      setActiveTab(tab as 'properties' | 'applications' | 'chats');
    }
  }, [searchParams]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all properties
      const propertiesResponse = await axios.get(`${apiUrl}/api/v1/properties/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAllProperties(propertiesResponse.data);
      setRecentProperties(propertiesResponse.data.slice(0, 6));

      // Fetch user's applications
      const applicationsResponse = await axios.get(`${apiUrl}/api/v1/escrow/my-applications`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setApplications(applicationsResponse.data);

      // Fetch user's chat rooms (privacy: only rooms where user is a participant)
      const chatResponse = await axios.get(`${apiUrl}/api/v1/chat/rooms`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Additional privacy validation: ensure user is participant in each room
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const filteredChatRooms = chatResponse.data.filter((room: any) => 
        room.participants.some((participant: any) => 
          participant.user_id === user.id && participant.is_active
        )
      );
      
      setChatRooms(filteredChatRooms);

      setError(null);
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getApplicationStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getApplicationTypeColor = (type: string) => {
    switch (type) {
      case 'loan': return 'text-blue-600 bg-blue-100';
      case 'purchase': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handleOnboardingSubmit = async (data: any) => {
    try {
      // Here you would typically submit the application to your backend
      console.log('Application submitted:', data);
      
      // For now, we'll just show a success message
      alert('Application submitted successfully! You can track your applications in the Applications tab.');
      
      // Refresh applications data
      fetchDashboardData();
    } catch (error) {
      console.error('Error submitting application:', error);
      throw error;
    }
  };


  const toggleFavorite = (propertyId: string) => {
    setFavoriteProperties(prev => 
      prev.includes(propertyId) 
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const toggleLike = (propertyId: string) => {
    setLikedProperties(prev => 
      prev.includes(propertyId) 
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const removeProperty = (propertyId: string) => {
    setRecentProperties(prev => prev.filter(prop => prop.id !== propertyId));
  };

  const handleBuyProperty = (property: Property) => {
    setSelectedProperty(property);
    setShowBuyModal(true);
  };

  const handleAgentProfileClick = (agentName: string, agentRating?: number, agentAvatar?: string) => {
    setAgentProfileModal({
      isOpen: true,
      agentName,
      agentRating,
      agentAvatar
    });
  };

  const getFilteredProperties = () => {
    if (propertyFilter === 'all') {
      return allProperties;
    }
    return allProperties.filter(property => property.type === propertyFilter);
  };

  const handleFlutterwavePayment = async () => {
    if (!selectedProperty) return;

    try {
      // Create a trade/escrow record first
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${apiUrl}/api/v1/escrow/`,
        {
          property_id: selectedProperty.id,
          seller_id: selectedProperty.owner_id,
          amount: selectedProperty.price,
          currency: 'NGN',
          escrow_type: 'property_purchase',
          description: `Purchase of ${selectedProperty.title}`
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const escrowId = response.data.id;

      // Initialize Flutterwave payment
      const paymentData = {
        public_key: process.env.REACT_APP_FLUTTERWAVE_PUBLIC_KEY || 'FLWPUBK_TEST-...',
        tx_ref: `property_${selectedProperty.id}_${Date.now()}`,
        amount: selectedProperty.price,
        currency: 'NGN',
        payment_options: 'card,mobilemoney,ussd',
        redirect_url: `${window.location.origin}/payment-success`,
        customer: {
          email: user.email,
          name: user.name,
        },
        customizations: {
          title: 'FindLand Africa - Property Purchase',
          description: `Payment for ${selectedProperty.title}`,
          logo: `${window.location.origin}/logo.png`,
        },
        meta: {
          escrow_id: escrowId,
          property_id: selectedProperty.id,
          buyer_id: user.id,
        }
      };

      // Load Flutterwave script and initialize payment
      const script = document.createElement('script');
      script.src = 'https://checkout.flutterwave.com/v3.js';
      script.onload = () => {
        // @ts-ignore
        window.FlutterwaveCheckout(paymentData);
      };
      document.body.appendChild(script);

      setShowBuyModal(false);
    } catch (error) {
      console.error('Error initiating payment:', error);
      alert('Error initiating payment. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">{error}</div>
          <button
            onClick={fetchDashboardData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="text-2xl font-bold text-blue-600">
                FindLand Africa
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user.name}</span>
              <button
                onClick={onLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Manage your property search, applications, and communications
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('properties')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'properties'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Properties ({recentProperties.length})
              </button>
              <button
                onClick={() => setActiveTab('applications')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'applications'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Applications ({applications.length})
              </button>
              <button
                onClick={() => setActiveTab('chats')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'chats'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Chats ({chatRooms.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'properties' && (
          <div>
            {/* Property Management Header */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Properties</h2>
                    <p className="text-sm text-gray-600">Browse and discover properties for sale and rent</p>
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
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        propertyFilter === 'sale'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      For Sale
                    </button>
                    <button
                      onClick={() => setPropertyFilter('rent')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        propertyFilter === 'rent'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      For Rent
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
                          <p className="text-gray-600 text-xs mb-3">{property.location}</p>
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // TODO: Create chat room for this property or navigate to existing one
                                  console.log('Chat functionality needs to be implemented for property:', property.id);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                              >
                                Chat
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
          </div>
        )}

        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">My Applications</h2>
              <Link
                to="/properties"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Browse Properties →
              </Link>
            </div>

            {applications.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Applications Yet</h3>
                <p className="text-gray-600 mb-4">You haven't submitted any applications yet.</p>
                <Link
                  to="/properties"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
                >
                  Browse Properties
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((application) => (
                  <div key={application.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{application.property.title}</h3>
                        <p className="text-gray-600">{application.property.location}</p>
                      </div>
                      <div className="flex space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getApplicationTypeColor(application.application_type)}`}>
                          {application.application_type}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getApplicationStatusColor(application.status)}`}>
                          {application.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Purpose</span>
                        <p className="text-gray-900">{application.purpose}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Timeline</span>
                        <p className="text-gray-900">{application.timeline}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Amount</span>
                        <p className="text-gray-900">{formatPrice(application.amount)}</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>Applied on {formatDate(application.created_at)}</span>
                      <div className="space-x-2">
                        <Link
                          to={`/property/${application.property_id}`}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View Property
                        </Link>
                        <button
                          onClick={() => {
                            // TODO: Find or create chat room for this application
                            console.log('Chat functionality needs to be implemented for application:', application.id);
                          }}
                          className="text-green-600 hover:text-green-700 font-medium"
                        >
                          Open Chat
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chats Tab */}
        {activeTab === 'chats' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">My Conversations</h2>
                <div className="flex items-center mt-1 space-x-2">
                  <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Private & Secure</span>
                  </div>
                  <span className="text-xs text-gray-500">Only conversations you participate in</span>
                </div>
              </div>
              <Link
                to="/properties"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Browse Properties →
              </Link>
            </div>

            {chatRooms.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Conversations Yet</h3>
                <p className="text-gray-600 mb-4">Start chatting with property owners to get more information.</p>
                <Link
                  to="/properties"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
                >
                  Browse Properties
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {chatRooms.map((chat) => (
                  <div key={chat.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/chat/${chat.id}`)}>
                    <div className="flex items-center p-3 sm:p-4">
                      {/* Agent Avatar */}
                      <div className="flex-shrink-0 mr-3 sm:mr-4">
                        <div 
                          className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (chat.agent_name) {
                              handleAgentProfileClick(chat.agent_name, chat.agent_rating, chat.agent_avatar);
                            }
                          }}
                        >
                          {chat.agent_avatar ? (
                            <span className="text-white text-sm sm:text-base font-bold">
                              {chat.agent_avatar}
                            </span>
                          ) : (
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          )}
                        </div>
                      </div>

                      {/* Chat Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              {chat.agent_name && (
                                <h3 className="text-sm sm:text-base font-bold text-blue-600 truncate">{chat.agent_name}</h3>
                              )}
                              <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full text-xs">
                                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                                <span className="font-medium">Private</span>
                              </div>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-700 truncate hidden sm:block md:block lg:block">{chat.property_title || 'Property Chat'}</p>
                            <p className="text-xs text-gray-500 truncate hidden sm:block md:block lg:block">{chat.property_location || 'Location not available'}</p>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-xs text-gray-500">
                              {chat.last_message?.created_at ? formatDate(chat.last_message.created_at) : formatDate(chat.created_at)}
                            </span>
                            {chat.status === 'active' && (
                              <div className="w-2 h-2 bg-green-500 rounded-full mt-1"></div>
                            )}
                          </div>
                        </div>
                        
                        {/* Last Message Preview */}
                        <div className="mt-1 flex justify-between items-center">
                          <div className="flex-1 min-w-0">
                            {chat.last_message ? (
                              <div className="flex items-center space-x-2">
                                {chat.last_message_sender_avatar && (
                                  <div className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-gray-600 text-xs font-medium">
                                      {chat.last_message_sender_avatar}
                                    </span>
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs sm:text-sm text-gray-600 truncate">
                                    <span className="font-medium text-gray-800">{chat.last_message.sender_name}:</span> 
                                    <span className="text-gray-600 ml-1">{chat.last_message.content}</span>
                                  </p>
                                  {chat.last_message.is_edited && (
                                    <span className="text-xs text-gray-400 ml-1">(edited)</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs sm:text-sm text-gray-500 truncate">No messages yet</p>
                            )}
                          </div>
                          <div className="flex space-x-1 sm:space-x-2 ml-2 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/chat/${chat.id}`);
                              }}
                              className="text-blue-600 hover:text-blue-700 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50"
                            >
                              Chat
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/properties/${chat.property_id}`);
                              }}
                              className="text-green-600 hover:text-green-700 text-xs font-medium px-2 py-1 rounded hover:bg-green-50 hidden sm:block"
                            >
                              View
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Onboarding Form Modal */}
      <OnboardingForm
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onSubmit={handleOnboardingSubmit}
        type={onboardingType}
        propertyTitle="General Property Inquiry"
      />

      {/* Buy Property Confirmation Modal */}
      {showBuyModal && selectedProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
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
                <h4 className="font-medium text-gray-900 mb-2">{selectedProperty.title}</h4>
                <p className="text-sm text-gray-600 mb-2">{selectedProperty.location}</p>
                <p className="text-lg font-bold text-green-600">{formatPrice(selectedProperty.price)}</p>
              </div>
              <p className="text-sm text-gray-600">
                You are about to purchase this property. This will create an escrow transaction and redirect you to Flutterwave for secure payment processing.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowBuyModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleFlutterwavePayment}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agent Profile Modal */}
      <AgentProfileModal
        isOpen={agentProfileModal.isOpen}
        onClose={() => setAgentProfileModal(prev => ({ ...prev, isOpen: false }))}
        agentName={agentProfileModal.agentName}
        agentRating={agentProfileModal.agentRating}
        agentAvatar={agentProfileModal.agentAvatar}
        apiUrl={apiUrl}
      />
    </div>
  );
};

export default BuyerDashboard;