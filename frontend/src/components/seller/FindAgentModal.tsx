import React, { useState, useEffect, useCallback } from 'react';
import AgentProfileModal from '../agent/AgentProfileModal';

interface Agent {
  id: string;
  name: string;
  email: string;
  phone_number?: string;
  rating: number;
  total_properties: number;
  avatar?: string;
  location?: string;
  specialties?: string[];
  experience_years?: number;
  is_online?: boolean;
}

interface FindAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiUrl: string;
}

const FindAgentModal: React.FC<FindAgentModalProps> = ({
  isOpen,
  onClose,
  apiUrl
}) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showAgentProfile, setShowAgentProfile] = useState(false);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/api/v1/agents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }

      const data = await response.json();
      setAgents(data);
    } catch (err) {
      console.error('Error fetching agents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load agents');
      // Mock data for development
      setAgents([
        {
          id: '1',
          name: 'Sarah Johnson',
          email: 'sarah.johnson@example.com',
          phone_number: '+234 801 234 5678',
          rating: 4.8,
          total_properties: 45,
          avatar: 'SJ',
          location: 'Lagos, Nigeria',
          specialties: ['Luxury Properties', 'Commercial Real Estate'],
          experience_years: 8,
          is_online: true
        },
        {
          id: '2',
          name: 'Michael Adebayo',
          email: 'michael.adebayo@example.com',
          phone_number: '+234 802 345 6789',
          rating: 4.6,
          total_properties: 32,
          avatar: 'MA',
          location: 'Lagos, Nigeria',
          specialties: ['Residential Properties', 'Property Management'],
          experience_years: 6,
          is_online: false
        },
        {
          id: '3',
          name: 'Grace Okafor',
          email: 'grace.okafor@example.com',
          phone_number: '+234 803 456 7890',
          rating: 4.9,
          total_properties: 67,
          avatar: 'GO',
          location: 'Lagos, Nigeria',
          specialties: ['Investment Properties', 'Land Sales'],
          experience_years: 12,
          is_online: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    if (isOpen) {
      fetchAgents();
    }
  }, [isOpen, fetchAgents]);

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.specialties?.some(specialty => 
      specialty.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleAgentClick = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowAgentProfile(true);
  };

  const handleCloseAgentProfile = () => {
    setShowAgentProfile(false);
    setSelectedAgent(null);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }

    if (hasHalfStar) {
      stars.push(
        <svg key="half" className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <defs>
            <linearGradient id="half-star">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="#E5E7EB" />
            </linearGradient>
          </defs>
          <path fill="url(#half-star)" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <svg key={`empty-${i}`} className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }

    return stars;
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Find an Agent</h2>
              <p className="text-gray-600 mt-1">Connect with experienced real estate agents</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-6 border-b border-gray-200">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search agents by name, location, or specialty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading agents...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={fetchAgents}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Retry
                </button>
              </div>
            ) : filteredAgents.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No agents found</h3>
                <p className="text-gray-500">Try adjusting your search criteria</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredAgents.map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => handleAgentClick(agent)}
                    className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start space-x-4">
                      {/* Agent Avatar */}
                      <div className="relative">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                          <span className="text-white text-lg font-bold">
                            {agent.avatar || agent.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        {agent.is_online && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                      </div>

                      {/* Agent Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">{agent.name}</h3>
                          <div className="flex items-center space-x-1">
                            {renderStars(agent.rating)}
                            <span className="text-sm text-gray-600 ml-1">({agent.rating})</span>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-1">{agent.location}</p>
                        
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span>{agent.total_properties} properties</span>
                          {agent.experience_years && (
                            <span>{agent.experience_years} years experience</span>
                          )}
                        </div>

                        {agent.specialties && agent.specialties.length > 0 && (
                          <div className="mt-3">
                            <div className="flex flex-wrap gap-1">
                              {agent.specialties.slice(0, 2).map((specialty, index) => (
                                <span
                                  key={index}
                                  className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                                >
                                  {specialty}
                                </span>
                              ))}
                              {agent.specialties.length > 2 && (
                                <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                                  +{agent.specialties.length - 2} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="mt-4 flex space-x-2">
                          <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                            View Profile
                          </button>
                          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                            Contact
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

      {/* Agent Profile Modal */}
      {showAgentProfile && selectedAgent && (
        <AgentProfileModal
          isOpen={showAgentProfile}
          onClose={handleCloseAgentProfile}
          agentName={selectedAgent.name}
          agentRating={selectedAgent.rating}
          agentAvatar={selectedAgent.avatar}
          apiUrl={apiUrl}
        />
      )}
    </>
  );
};

export default FindAgentModal;



