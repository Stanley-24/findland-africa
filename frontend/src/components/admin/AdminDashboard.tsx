import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatPrice } from '../../utils/textUtils';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone_number?: string;
  is_active: boolean;
  is_verified: boolean;
}

interface Property {
  id: string;
  title: string;
  description: string;
  type: 'rent' | 'sale' | 'land';
  price: number;
  location: string;
  status: string;
  created_at: string;
  owner_id: string;
  media?: Array<{
    id: string;
    media_type: string;
    url: string;
  }>;
}

interface AgentApplication {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  company_name?: string;
  license_number?: string;
  years_experience?: string;
  specializations?: string[];
  portfolio_url?: string;
  linkedin_url?: string;
  motivation: string;
  references?: Array<{name: string, email: string, phone: string}>;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  review_notes?: string;
}

interface AdminDashboardProps {
  user: User;
  apiUrl: string;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, apiUrl, onLogout }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [agentApplications, setAgentApplications] = useState<AgentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'properties' | 'users' | 'reports' | 'agents'>('overview');
  const [reviewingApplication, setReviewingApplication] = useState<AgentApplication | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');

  const fetchDashboardData = React.useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch all properties for admin overview
      const propertiesResponse = await fetch(`${apiUrl}/api/v1/properties/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!propertiesResponse.ok) {
        throw new Error('Failed to fetch properties');
      }

      const propertiesData = await propertiesResponse.json();
      setProperties(Array.isArray(propertiesData) ? propertiesData : propertiesData.items || []);

      // Fetch agent applications
      const applicationsResponse = await fetch(`${apiUrl}/api/v1/agent-applications/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (applicationsResponse.ok) {
        const applicationsData = await applicationsResponse.json();
        setAgentApplications(applicationsData);
      } else {
        console.error('Failed to fetch agent applications:', applicationsResponse.status, applicationsResponse.statusText);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleReviewApplication = async (applicationId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/api/v1/agent-applications/${applicationId}/review`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: reviewStatus,
          review_notes: reviewNotes
        })
      });

      if (response.ok) {
        // Refresh the applications list
        await fetchDashboardData();
        setReviewingApplication(null);
        setReviewNotes('');
        setReviewStatus('approved');
      } else {
        alert('Failed to review application');
      }
    } catch (error) {
      console.error('Error reviewing application:', error);
      alert('Error reviewing application');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      // Property statuses
      case 'available': return 'bg-green-100 text-green-800';
      case 'sold': return 'bg-red-100 text-red-800';
      case 'rented': return 'bg-blue-100 text-blue-800';
      // Agent application statuses
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      // Common statuses
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Using shared formatPrice utility

  const getPropertyTypeColor = (type: string) => {
    switch (type) {
      case 'sale': return 'bg-green-100 text-green-800';
      case 'rent': return 'bg-blue-100 text-blue-800';
      case 'land': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
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
              <span className="text-gray-700 text-sm">
                Welcome, {user.name}
              </span>
              <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </span>
              <button
                onClick={onLogout}
                className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors"
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
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Manage the platform, users, and properties
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex flex-wrap space-x-4 sm:space-x-8 overflow-x-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('properties')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'properties'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Properties
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Users
              </button>
              <button
                onClick={() => setActiveTab('agents')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'agents'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="flex items-center">
                  Agent Applications ({agentApplications.length})
                  {agentApplications.filter(app => app.status === 'pending').length > 0 && (
                    <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                      {agentApplications.filter(app => app.status === 'pending').length}
                    </span>
                  )}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'reports'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Reports
              </button>
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Properties</p>
                    <p className="text-2xl font-bold text-gray-900">{properties.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Available</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {properties.filter(p => p.status.toLowerCase() === 'available').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {properties.filter(p => p.status.toLowerCase() === 'pending').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Agent Applications</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {agentApplications.length}
                    </p>
                    {agentApplications.filter(app => app.status === 'pending').length > 0 && (
                      <p className="text-xs text-red-600 font-medium">
                        {agentApplications.filter(app => app.status === 'pending').length} pending
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Properties */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Properties</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {properties.slice(0, 5).map((property) => (
                  <div key={property.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900">{property.title}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPropertyTypeColor(property.type)}`}>
                            {property.type.charAt(0).toUpperCase() + property.type.slice(1)}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(property.status)}`}>
                            {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-6 text-sm text-gray-500">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {property.location}
                          </div>
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(property.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-xl font-bold text-blue-600">
                            {formatPrice(property.price)}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Link
                            to={`/properties/${property.id}`}
                            className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            View
                          </Link>
                          <button className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Properties Tab */}
        {activeTab === 'properties' && (
          <div>
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">All Properties</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {properties.map((property) => (
                  <div key={property.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900">{property.title}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPropertyTypeColor(property.type)}`}>
                            {property.type.charAt(0).toUpperCase() + property.type.slice(1)}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(property.status)}`}>
                            {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-2 line-clamp-2">{property.description}</p>
                        <div className="flex items-center space-x-6 text-sm text-gray-500">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {property.location}
                          </div>
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(property.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-xl font-bold text-blue-600">
                            {formatPrice(property.price)}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Link
                            to={`/properties/${property.id}`}
                            className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            View
                          </Link>
                          <button className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                            Edit
                          </button>
                          <button className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">User Management</h3>
            <p className="text-gray-600">User management features coming soon...</p>
          </div>
        )}

        {/* Agent Applications Tab */}
        {activeTab === 'agents' && (
          <div>
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Agent Applications</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Review and manage agent applications
                </p>
              </div>
              <div className="divide-y divide-gray-200">
                {agentApplications.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-gray-500 mb-4">No agent applications found</p>
                    <p className="text-sm text-gray-400">
                      Agent applications will appear here when users submit them through the registration form.
                    </p>
                  </div>
                ) : (
                  agentApplications.map((application) => (
                    <div key={application.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-3">
                            <h4 className="text-lg font-semibold text-gray-900">
                              {application.user_name}
                            </h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                              {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <span className="font-medium text-gray-700">Email:</span>
                              <span className="ml-2 text-gray-600">{application.user_email}</span>
                            </div>
                            {application.company_name && (
                              <div>
                                <span className="font-medium text-gray-700">Company:</span>
                                <span className="ml-2 text-gray-600">{application.company_name}</span>
                              </div>
                            )}
                            {application.years_experience && (
                              <div>
                                <span className="font-medium text-gray-700">Experience:</span>
                                <span className="ml-2 text-gray-600">{application.years_experience}</span>
                              </div>
                            )}
                            {application.license_number && (
                              <div>
                                <span className="font-medium text-gray-700">License:</span>
                                <span className="ml-2 text-gray-600">{application.license_number}</span>
                              </div>
                            )}
                          </div>

                          {application.specializations && application.specializations.length > 0 && (
                            <div className="mb-4">
                              <span className="font-medium text-gray-700">Specializations:</span>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {application.specializations.map((spec, index) => (
                                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                    {spec}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="mb-4">
                            <span className="font-medium text-gray-700">Motivation:</span>
                            <p className="mt-1 text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">
                              {application.motivation}
                            </p>
                          </div>

                          <div className="flex items-center space-x-6 text-sm text-gray-500">
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Applied: {new Date(application.created_at).toLocaleDateString()}
                            </div>
                            {application.reviewed_at && (
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Reviewed: {new Date(application.reviewed_at).toLocaleDateString()}
                              </div>
                            )}
                          </div>

                          {application.review_notes && (
                            <div className="mt-3">
                              <span className="font-medium text-gray-700">Review Notes:</span>
                              <p className="mt-1 text-gray-600 text-sm bg-yellow-50 p-3 rounded-lg">
                                {application.review_notes}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col space-y-2 ml-6">
                          {application.status === 'pending' && (
                            <>
                              <button
                                onClick={() => setReviewingApplication(application)}
                                className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                              >
                                Review
                              </button>
                            </>
                          )}
                          {application.portfolio_url && (
                            <a
                              href={application.portfolio_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-green-100 hover:bg-green-200 text-green-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-center"
                            >
                              Portfolio
                            </a>
                          )}
                          {application.linkedin_url && (
                            <a
                              href={application.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-center"
                            >
                              LinkedIn
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Reports & Analytics</h3>
            <p className="text-gray-600">Reports and analytics features coming soon...</p>
          </div>
        )}
      </div>

      {/* Review Application Modal */}
      {reviewingApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Review Agent Application
                </h2>
                <button
                  onClick={() => {
                    setReviewingApplication(null);
                    setReviewNotes('');
                    setReviewStatus('approved');
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Application from: {reviewingApplication.user_name}
                </h3>
                <p className="text-gray-600 mb-4">{reviewingApplication.user_email}</p>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Motivation:</h4>
                  <p className="text-gray-700 text-sm">{reviewingApplication.motivation}</p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Decision
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="approved"
                      checked={reviewStatus === 'approved'}
                      onChange={(e) => setReviewStatus(e.target.value as 'approved' | 'rejected')}
                      className="mr-2"
                    />
                    <span className="text-green-700 font-medium">Approve</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="rejected"
                      checked={reviewStatus === 'rejected'}
                      onChange={(e) => setReviewStatus(e.target.value as 'approved' | 'rejected')}
                      className="mr-2"
                    />
                    <span className="text-red-700 font-medium">Reject</span>
                  </label>
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="reviewNotes" className="block text-sm font-medium text-gray-700 mb-2">
                  Review Notes
                </label>
                <textarea
                  id="reviewNotes"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes about your decision..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setReviewingApplication(null);
                    setReviewNotes('');
                    setReviewStatus('approved');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReviewApplication(reviewingApplication.id)}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                    reviewStatus === 'approved'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {reviewStatus === 'approved' ? 'Approve Application' : 'Reject Application'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
