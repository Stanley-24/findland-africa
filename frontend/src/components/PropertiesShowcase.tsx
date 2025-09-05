import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OnboardingForm from './OnboardingForm';

interface Property {
  id: string;
  title: string;
  description: string;
  type: 'rent' | 'sale';
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

interface PropertiesShowcaseProps {
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

const PropertiesShowcase: React.FC<PropertiesShowcaseProps> = ({ apiUrl }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingType, setOnboardingType] = useState<'loan' | 'contact' | 'purchase'>('contact');
  const [onboardingProperty, setOnboardingProperty] = useState<Property | null>(null);
  const navigate = useNavigate();

  const handleOnboardingSubmit = async (data: OnboardingData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login to continue');
        return;
      }

      if (!onboardingProperty) {
        alert('Property not found');
        return;
      }

      // Create the appropriate request based on onboarding type
      let endpoint = '';
      let requestBody = {};

      switch (onboardingType) {
        case 'contact':
          endpoint = '/api/v1/chat/rooms';
          requestBody = {
            property_id: onboardingProperty.id,
            room_type: 'property_inquiry',
            user_info: {
              full_name: data.fullName,
              email: data.email,
              phone: data.phone,
              purpose: data.purpose,
              timeline: data.timeline,
              additional_info: data.additionalInfo
            }
          };
          break;
        case 'loan':
          endpoint = '/api/v1/escrow/';
          requestBody = {
            property_id: onboardingProperty.id,
            amount: data.budget || onboardingProperty.price,
            currency: 'NGN',
            escrow_type: 'bridging_loan',
            description: `Bridging loan application for ${onboardingProperty.title}`,
            user_info: {
              full_name: data.fullName,
              email: data.email,
              phone: data.phone,
              purpose: data.purpose,
              timeline: data.timeline,
              additional_info: data.additionalInfo
            }
          };
          break;
        case 'purchase':
          endpoint = '/api/v1/escrow/';
          requestBody = {
            property_id: onboardingProperty.id,
            amount: onboardingProperty.price,
            currency: 'NGN',
            escrow_type: 'property_purchase',
            description: `Property purchase interest for ${onboardingProperty.title}`,
            user_info: {
              full_name: data.fullName,
              email: data.email,
              phone: data.phone,
              purpose: data.purpose,
              timeline: data.timeline,
              additional_info: data.additionalInfo
            }
          };
          break;
      }

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const result = await response.json();
        alert(`${onboardingType === 'contact' ? 'Contact request' : onboardingType === 'loan' ? 'Loan application' : 'Purchase interest'} submitted successfully!`);
        
        // Redirect based on type
        if (onboardingType === 'contact') {
          window.open(`/chat/${result.id}`, '_blank');
        } else {
          window.open(`/${onboardingType}/${result.id}`, '_blank');
        }
      } else {
        alert(`Failed to submit ${onboardingType} request. Please try again.`);
      }
    } catch (error) {
      console.error(`Error submitting ${onboardingType} request:`, error);
      alert(`Error submitting ${onboardingType} request. Please try again.`);
    }
  };

  const handleChatClick = (property: Property) => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      // Redirect to signup page if not logged in
      navigate('/register');
      return;
    }
    setOnboardingType('contact');
    setOnboardingProperty(property);
    setShowOnboarding(true);
  };

  const handleBuyClick = (property: Property) => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      // Redirect to signup page if not logged in
      navigate('/register');
      return;
    }
    setOnboardingType('purchase');
    setOnboardingProperty(property);
    setShowOnboarding(true);
  };

  const handlePropertyClick = (property: Property) => {
    // Navigate to property detail page
    navigate(`/properties/${property.id}`);
  };

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/properties/?limit=12`);
        if (!response.ok) {
          throw new Error('Failed to fetch properties');
        }
        const data = await response.json();
        setProperties(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [apiUrl]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getPropertyTypeColor = (type: string) => {
    switch (type) {
      case 'sale': return 'bg-green-100 text-green-800';
      case 'rent': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading properties...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">⚠️</div>
            <p className="text-gray-600">Unable to load properties. Please try again later.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Featured Properties in Lagos
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover verified properties with secure transactions, instant communication, and bridging loan support.
          </p>
        </div>

        {/* Moving Horizontal Cards */}
        <div className="relative overflow-hidden mb-12">
          <div className="flex animate-scroll space-x-6">
            {/* Duplicate the properties array to create seamless loop */}
            {[...properties, ...properties].map((property, index) => (
              <div 
                key={`${property.id}-${index}`}
                className="flex-shrink-0 w-80 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100 overflow-hidden cursor-pointer"
                onClick={() => handlePropertyClick(property)}
              >
                {/* Property Image */}
                <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-200 relative">
                  {property.media && property.media.length > 0 ? (
                    <img
                      src={property.media[0].url}
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                        </div>
                        <p className="text-blue-600 font-medium">Property Image</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPropertyTypeColor(property.type)}`}>
                      {property.type.charAt(0).toUpperCase() + property.type.slice(1)}
                    </span>
                  </div>
                  <div className="absolute top-4 right-4">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                      ✓ Verified
                    </span>
                  </div>
                </div>

                {/* Property Details */}
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {property.title}
                  </h3>
                  <p className="text-gray-600 mb-3 line-clamp-2 text-sm">
                    {property.description}
                  </p>
                  <div className="flex items-center text-gray-500 mb-4">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm">{property.location}</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xl font-bold text-blue-600">
                      {formatPrice(property.price)}
                    </span>
                    <span className="text-sm text-gray-500 capitalize">
                      {property.status}
                    </span>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChatClick(property);
                      }}
                      className="flex items-center justify-center space-x-1 bg-green-50 hover:bg-green-100 text-green-700 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span>Chat</span>
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBuyClick(property);
                      }}
                      className="flex items-center justify-center space-x-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                      </svg>
                      <span>Buy</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Features Highlight */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Why Choose Our Platform?
            </h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We combine property listings with secure communication and bridging loan services to make your real estate journey seamless.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* In-App Chat Feature */}
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Secure In-App Chat</h4>
              <p className="text-gray-600 text-sm">
                End-to-end encrypted messaging with buyers, sellers, and agents. Share documents, voice notes, and media securely.
              </p>
            </div>

            {/* Bridging Loan Feature */}
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Bridging Loan Support</h4>
              <p className="text-gray-600 text-sm">
                Get instant bridging loans to secure your dream property. Fast approval, competitive rates, and flexible terms.
              </p>
            </div>

            {/* Verified Properties Feature */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Verified Properties</h4>
              <p className="text-gray-600 text-sm">
                All properties are verified by our team. Real photos, accurate details, and legitimate listings only.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Property Detail Modal */}
      {selectedProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="relative">
              {/* Close Button */}
              <button
                onClick={() => setSelectedProperty(null)}
                className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Property Images */}
              <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-200 relative">
                {selectedProperty.media && selectedProperty.media.length > 0 ? (
                  <img
                    src={selectedProperty.media[0].url}
                    alt={selectedProperty.title}
                    className="w-full h-full object-cover rounded-t-2xl"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                      </div>
                      <p className="text-blue-600 font-medium text-lg">Property Image</p>
                    </div>
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <span className={`px-4 py-2 rounded-full text-sm font-medium ${getPropertyTypeColor(selectedProperty.type)}`}>
                    {selectedProperty.type.charAt(0).toUpperCase() + selectedProperty.type.slice(1)}
                  </span>
                </div>
                <div className="absolute top-4 right-16">
                  <span className="bg-green-100 text-green-800 px-3 py-2 rounded-full text-sm font-medium">
                    ✓ Verified Property
                  </span>
                </div>
              </div>

              {/* Property Details */}
              <div className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Main Details */}
                  <div className="lg:col-span-2">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">
                      {selectedProperty.title}
                    </h1>
                    
                    <div className="flex items-center text-gray-600 mb-6">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-lg">{selectedProperty.location}</span>
                    </div>

                    <div className="prose max-w-none mb-8">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Description</h3>
                      <p className="text-gray-700 leading-relaxed">
                        {selectedProperty.description}
                      </p>
                    </div>

                    {/* Property Features */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-1">Property Type</div>
                        <div className="font-semibold text-gray-900 capitalize">{selectedProperty.type}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-1">Status</div>
                        <div className="font-semibold text-gray-900 capitalize">{selectedProperty.status}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-1">Listed</div>
                        <div className="font-semibold text-gray-900">
                          {new Date(selectedProperty.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-1">Verification</div>
                        <div className="font-semibold text-green-600">✓ Verified</div>
                      </div>
                    </div>
                  </div>

                  {/* Price and Actions */}
                  <div className="lg:col-span-1">
                    <div className="bg-blue-50 rounded-2xl p-6 sticky top-8">
                      <div className="text-center mb-6">
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                          {formatPrice(selectedProperty.price)}
                        </div>
                        <div className="text-gray-600">
                          {selectedProperty.type === 'rent' ? 'per month' : 'total price'}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-4">
                        <button
                          onClick={() => {
                            if (selectedProperty.type === 'sale') {
                              handleBuyClick(selectedProperty);
                            } else {
                              handleChatClick(selectedProperty);
                            }
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
                        >
                          {selectedProperty.type === 'sale' ? 'Express Interest to Buy' : 'Contact Owner'}
                        </button>
                        
                        <button
                          onClick={() => handleChatClick(selectedProperty)}
                          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
                        >
                          Start Chat
                        </button>
                        
                        <button
                          onClick={() => handleBuyClick(selectedProperty)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
                        >
                          Buy Property
                        </button>
                      </div>

                      {/* Security Badges */}
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 text-green-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Secure
                          </div>
                          <div className="flex items-center">
                            <svg className="w-4 h-4 text-green-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Verified
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Form Modal */}
      <OnboardingForm
        isOpen={showOnboarding}
        onClose={() => {
          setShowOnboarding(false);
          setOnboardingProperty(null);
        }}
        onSubmit={handleOnboardingSubmit}
        type={onboardingType}
        propertyTitle={onboardingProperty?.title}
      />
    </section>
  );
};

export default PropertiesShowcase;