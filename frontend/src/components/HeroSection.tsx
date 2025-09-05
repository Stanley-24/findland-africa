import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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

const HeroSection: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [featuredProperty, setFeaturedProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  // Fetch featured property with images
  useEffect(() => {
    const fetchFeaturedProperty = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/properties/?limit=10`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            // Find the first property that has media/images
            const propertyWithMedia = data.find((property: Property) => 
              property.media && property.media.length > 0
            );
            // If no property with media found, use the first property
            setFeaturedProperty(propertyWithMedia || data[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching featured property:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedProperty();
  }, [apiUrl]);

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

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `₦${(price / 1000000).toFixed(1)}M`;
    } else if (price >= 1000) {
      return `₦${(price / 1000).toFixed(0)}K`;
    }
    return `₦${price.toLocaleString()}`;
  };

  return (
    <section className="bg-gradient-to-br from-blue-50 to-white py-16 lg:py-24">
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
                        {formatPrice(featuredProperty.price)}
                      </span>
                      <span className="text-sm text-gray-500 capitalize">
                        {featuredProperty.type === 'rent' ? 'For Rent' : 'For Sale'}
                      </span>
                    </div>
                    <button
                      onClick={() => navigate(`/properties/${featuredProperty.id}`)}
                      className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                    >
                      View Details
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
    </section>
  );
};

export default HeroSection;
