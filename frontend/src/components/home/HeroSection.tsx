import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatPriceCompact } from '../../utils/textUtils';
import AgentApplicationForm from '../agent/AgentApplicationForm';
import { saveUserIntent } from '../../utils/userIntent';
import { useDataCache } from '../../contexts/DataCacheContext';

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

const HeroSection: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [featuredProperty, setFeaturedProperty] = useState<Property | null>(null);
  const [showAgentApplication, setShowAgentApplication] = useState(false);
  const navigate = useNavigate();
  const { featuredProperties, loading } = useDataCache();

  // Use cached featured properties
  useEffect(() => {
    if (featuredProperties && featuredProperties.length > 0) {
      // Find the first property that has media/images
      const propertyWithMedia = featuredProperties.find((property: Property) => 
        property.media && property.media.length > 0
      );
      // If no property with media found, use the first property
      setFeaturedProperty(propertyWithMedia || featuredProperties[0]);
    }
  }, [featuredProperties]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const params = new URLSearchParams();
      if (searchType !== 'all') {
        params.set('type', searchType);
      }
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }
      navigate(`/properties?${params.toString()}`);
    }
  };

  // Using shared formatPriceCompactCompact utility

  const handleChatClick = (property: Property) => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      // Save user intent and redirect to login page
      const intent = {
        action: 'chat' as const,
        property_id: property.id,
        property_title: property.title,
        timestamp: Date.now()
      };
      saveUserIntent(intent);
      navigate('/login');
      return;
    }
    // If logged in, navigate to property detail with chat action
    navigate(`/properties/${property.id}?action=chat`);
  };

  const handleBuyClick = (property: Property) => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      // Save user intent and redirect to login page
      const intent = {
        action: 'purchase' as const,
        property_id: property.id,
        property_title: property.title,
        timestamp: Date.now()
      };
      saveUserIntent(intent);
      navigate('/login');
      return;
    }
    // If logged in, navigate to property detail with buy action
    navigate(`/properties/${property.id}?action=buy`);
  };

  return (
    <section className="bg-gradient-to-br from-blue-50 to-white py-8 lg:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Find Your Dream Home in{' '}
                <span className="text-blue-600">Africa</span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Browse thousands of verified listings, from apartments to land, across the continent. 
                Your perfect property is just a search away.
              </p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter location, keywords..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  />
                </div>
                <div className="sm:w-32">
                  <select
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  >
                    <option value="all">All Types</option>
                    <option value="buy">Buy</option>
                    <option value="rent">Rent</option>
                    <option value="land">Land</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors whitespace-nowrap"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">10K+</div>
                <div className="text-sm text-gray-600">Properties</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">50+</div>
                <div className="text-sm text-gray-600">Cities</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">5K+</div>
                <div className="text-sm text-gray-600">Happy Users</div>
              </div>
            </div>
          </div>

          {/* Right Side - Featured Property Card */}
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-2xl p-6 border border-gray-100 hover:shadow-3xl transition-shadow duration-300">
              {loading ? (
                <div className="space-y-4">
                  <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
                    <div className="flex justify-between items-center">
                      <div className="h-6 bg-gray-200 rounded animate-pulse w-20"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
                    </div>
                  </div>
                </div>
              ) : featuredProperty ? (
                <div className="space-y-4">
                  {/* Property Image */}
                  <div className="aspect-video rounded-lg overflow-hidden">
                    {featuredProperty.media && featuredProperty.media.length > 0 ? (
                      <img
                        src={featuredProperty.media[0].url}
                        alt={featuredProperty.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center ${featuredProperty.media && featuredProperty.media.length > 0 ? 'hidden' : ''}`}>
                      <div className="text-center">
                        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                        </div>
                        <p className="text-blue-600 font-medium">Property Preview</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Property Details */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900 text-lg leading-tight">
                      {featuredProperty.title}
                    </h3>
                    <p className="text-gray-600 text-sm">{featuredProperty.location}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-blue-600">
                        {formatPriceCompact(featuredProperty.price)}
                      </span>
                      <span className="text-sm text-gray-500 capitalize">
                        {featuredProperty.type === 'rent' ? 'For Rent' : 'For Sale'}
                      </span>
                    </div>
                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <button
                        onClick={() => navigate(`/properties/${featuredProperty.id}`)}
                        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                        title="View full property details"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleChatClick(featuredProperty)}
                        className="bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                        title={!localStorage.getItem('token') ? 'Login required to start chat' : 'Start chat with property owner'}
                      >
                        Chat
                      </button>
                    </div>
                    <button
                      onClick={() => handleBuyClick(featuredProperty)}
                      className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                      title={!localStorage.getItem('token') ? 'Login required to express interest' : 'Express interest to buy this property'}
                    >
                      Express Interest
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-400 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                      </div>
                      <p className="text-gray-500 font-medium">No Properties Available</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Decorative Elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-100 rounded-full opacity-50"></div>
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-blue-200 rounded-full opacity-30"></div>
          </div>
        </div>
      </div>

      {/* Agent Promotion Section */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              🤝 Join Our Network of Real Estate Professionals
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Become a verified agent on FindLand Africa and help clients find their dream properties while growing your business.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Fast Approval</h3>
                <p className="text-blue-100 text-sm">Get approved within 3-5 business days with our streamlined process</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Competitive Commission</h3>
                <p className="text-blue-100 text-sm">Earn competitive commissions on every successful transaction</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Quality Leads</h3>
                <p className="text-blue-100 text-sm">Access verified leads and connect with serious buyers and sellers</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowAgentApplication(true)}
                className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-lg font-semibold text-lg transition-colors shadow-lg"
              >
                Apply to Become an Agent
              </button>
              <button
                onClick={() => {
                  const token = localStorage.getItem('token');
                  if (!token) {
                    // Save a general browse intent and redirect to login
                    saveUserIntent({
                      action: 'chat', // Use chat as default action for browsing
                      property_id: '', // Empty property_id for general browsing
                      property_title: 'Browse Properties',
                      timestamp: Date.now()
                    });
                    navigate('/login');
                  } else {
                    navigate('/properties');
                  }
                }}
                className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3 rounded-lg font-semibold text-lg transition-colors"
                title={!localStorage.getItem('token') ? 'Login required to browse properties' : 'Browse all available properties'}
              >
                Browse Properties
              </button>
            </div>
            
            <p className="text-blue-200 text-sm mt-6">
              Already have an account? <button 
                onClick={() => navigate('/login')}
                className="text-white hover:text-blue-100 underline font-medium"
              >
                Sign in to apply
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Agent Application Modal */}
      {showAgentApplication && (
        <AgentApplicationForm onClose={() => setShowAgentApplication(false)} />
      )}
    </section>
  );
};

export default HeroSection;
