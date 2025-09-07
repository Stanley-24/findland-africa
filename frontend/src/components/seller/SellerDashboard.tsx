import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ListedPropertiesTab from './ListedPropertiesTab';
import ApplicationsTab from './ApplicationsTab';
import ChatsTab from './ChatsTab';
import AnalyticsTab from './AnalyticsTab';
import FindAgentModal from './FindAgentModal';
import { SellerDashboardProps, Property, Application, ChatRoom, Analytics } from '../../types/sellerDashboard';

const SellerDashboard: React.FC<SellerDashboardProps> = ({ user, apiUrl, onLogout }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State management
  const [properties, setProperties] = useState<Property[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'listed-properties' | 'applications' | 'chats' | 'analytics'>('listed-properties');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [showFindAgentModal, setShowFindAgentModal] = useState(false);
  const loadProperties = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/api/v1/properties/my-properties`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch properties');
      }

      const data = await response.json();
      setProperties(data);
    } catch (err) {
      console.error('Error loading properties:', err);
    }
  }, [apiUrl]);

  const loadChatRooms = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/api/v1/fast/chat/rooms`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Filter out empty chat rooms (those without messages)
        const chatRoomsWithMessages = data.filter((room: any) => room.last_message);
        console.log(`Filtered ${data.length - chatRoomsWithMessages.length} empty chat rooms`);
        setChatRooms(chatRoomsWithMessages);
      }
    } catch (err) {
      console.error('Error loading chat rooms:', err);
      setChatRooms([]);
    }
  }, [apiUrl]);

  const loadApplications = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/api/v1/escrow/my-applications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setApplications(data);
      }
    } catch (err) {
      console.error('Error loading applications:', err);
      setApplications([]);
    }
  }, [apiUrl]);

  const loadAnalytics = useCallback(async () => {
    try {
      // Mock analytics data for now
      const mockAnalytics: Analytics = {
        totalViews: 1250,
        totalInquiries: 45,
        conversionRate: 3.6,
        avgResponseTime: '2.5 hours',
        topPerformingProperty: properties[0]?.title || 'No properties yet',
        monthlyRevenue: 15000000,
        pendingApplications: applications.length,
        activeChats: chatRooms.length
      };
      setAnalytics(mockAnalytics);
    } catch (err) {
      console.error('Error loading analytics:', err);
    }
  }, [properties, applications, chatRooms]);

  const loadData = useCallback(async () => {
    if (dataLoaded) return; // Prevent multiple simultaneous calls
    
    try {
      setLoading(true);
      setError(null);
      await Promise.all([
        loadProperties(),
        loadApplications(),
        loadChatRooms(),
      ]);
      setDataLoaded(true);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [loadProperties, loadApplications, loadChatRooms, dataLoaded]);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle URL parameters to set active tab
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['listed-properties', 'applications', 'chats', 'analytics'].includes(tab)) {
      setActiveTab(tab as 'listed-properties' | 'applications' | 'chats' | 'analytics');
    }
  }, [searchParams]);

  // Load analytics when analytics tab is active
  useEffect(() => {
    if (activeTab === 'analytics' && dataLoaded) {
      loadAnalytics();
    }
  }, [activeTab, dataLoaded, loadAnalytics]);

  // Refresh chat rooms when chats tab becomes active
  useEffect(() => {
    if (activeTab === 'chats') {
      loadChatRooms();
    }
  }, [activeTab, loadChatRooms]);

  // Helper function to handle tab changes and update URL
  const handleTabChange = (tab: 'listed-properties' | 'applications' | 'chats' | 'analytics') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Property management functions
  const handleEditProperty = (propertyId: string) => {
    // TODO: Implement edit property functionality
    // For now, navigate to property detail page where edit can be implemented
    navigate(`/property/${propertyId}?edit=true`);
  };

  const handleDeleteProperty = async (propertyId: string) => {
    if (!window.confirm('Are you sure you want to delete this property?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/api/v1/properties/${propertyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete property');
      }

      // Remove property from local state
      setProperties(properties.filter(p => p.id !== propertyId));
    } catch (err) {
      alert('Failed to delete property. Please try again.');
      console.error('Error deleting property:', err);
    }
  };

  const handleAddProperty = () => {
    // TODO: Implement add property modal
    console.log('Add property clicked');
  };

  const handleApplyForLoan = () => {
    // TODO: Implement loan application form
    console.log('Apply for loan clicked');
  };

  // Chat management functions
  const handleChatSelection = (chatId: string) => {
    setSelectedChats(prev => 
      prev.includes(chatId) 
        ? prev.filter(id => id !== chatId)
        : [...prev, chatId]
    );
  };

  const handleSelectAllChats = () => {
    setSelectedChats(prev => 
      prev.length === chatRooms.length ? [] : chatRooms.map(chat => chat.id)
    );
  };

  const handleBatchDeleteChats = async () => {
    try {
      const token = localStorage.getItem('token');
      const deleteResults = await Promise.allSettled(
        selectedChats.map(chatId => 
          fetch(`${apiUrl}/api/v1/fast/chat/rooms/${chatId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          })
        )
      );
      
      // Track successful and failed deletions
      const successfulDeletions: string[] = [];
      const failedDeletions: string[] = [];
      
      deleteResults.forEach((result, index) => {
        const chatId = selectedChats[index];
        if (result.status === 'fulfilled') {
          successfulDeletions.push(chatId);
        } else {
          failedDeletions.push(chatId);
          console.warn(`Failed to delete chat ${chatId}:`, result.reason);
        }
      });
      
      // Remove successfully deleted chats from the list
      if (successfulDeletions.length > 0) {
        setChatRooms(prev => prev.filter(chat => !successfulDeletions.includes(chat.id)));
      }
      
      // Clear selection
      setSelectedChats([]);

      // Show user feedback if some deletions failed
      if (failedDeletions.length > 0) {
        console.warn(`${failedDeletions.length} chat(s) could not be deleted. You may not have permission to delete them.`);
      }
      
    } catch (err) {
      console.error('Error deleting chats:', err);
    }
  };

  const handleDeleteSingleChat = async (chatId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/api/v1/fast/chat/rooms/${chatId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        setChatRooms(prev => prev.filter(chat => chat.id !== chatId));
        setSelectedChats(prev => prev.filter(id => id !== chatId));
      } else if (response.status === 404) {
        // Remove from local state if it's a 404 (already deleted)
        setChatRooms(prev => prev.filter(chat => chat.id !== chatId));
        setSelectedChats(prev => prev.filter(id => id !== chatId));
      }
    } catch (err: any) {
      console.error('Error deleting chat:', err);
    }
  };

  const handleAgentProfileClick = (name: string, rating?: number, avatar?: string) => {
    // TODO: Implement agent profile modal
    console.log('Agent profile clicked:', { name, rating, avatar });
  };

  const handleNavigateToProperties = () => {
    handleTabChange('listed-properties');
  };

  // Retry function
  const retryLoadData = () => {
    setDataLoaded(false);
    setError(null);
    loadData();
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={retryLoadData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Seller Dashboard</h1>
              <span className="ml-3 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                {user.name}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFindAgentModal(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Find Agent</span>
              </button>
              <button
                onClick={onLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => handleTabChange('listed-properties')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'listed-properties'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Properties
            </button>
            <button
              onClick={() => handleTabChange('applications')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'applications'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Applications
            </button>
            <button
              onClick={() => handleTabChange('chats')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'chats'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Chats
            </button>
            <button
              onClick={() => handleTabChange('analytics')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analytics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Analytics
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'listed-properties' && (
          <ListedPropertiesTab
            user={user}
            apiUrl={apiUrl}
            onLogout={onLogout}
            properties={properties}
            onEditProperty={handleEditProperty}
            onDeleteProperty={handleDeleteProperty}
            onAddProperty={handleAddProperty}
          />
        )}

        {activeTab === 'applications' && (
          <ApplicationsTab
            user={user}
            apiUrl={apiUrl}
            onLogout={onLogout}
            applications={applications}
            onApplyForLoan={handleApplyForLoan}
          />
        )}

        {activeTab === 'chats' && (
          <ChatsTab
            user={user}
            apiUrl={apiUrl}
            onLogout={onLogout}
            chatRooms={chatRooms}
            selectedChats={selectedChats}
            onChatSelection={handleChatSelection}
            onSelectAllChats={handleSelectAllChats}
            onBatchDeleteChats={handleBatchDeleteChats}
            onDeleteSingleChat={handleDeleteSingleChat}
            onAgentProfileClick={handleAgentProfileClick}
            onNavigateToProperties={handleNavigateToProperties}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab
            user={user}
            apiUrl={apiUrl}
            onLogout={onLogout}
            analytics={analytics}
            isLoading={activeTab === 'analytics' && !analytics}
          />
        )}
      </div>

      {/* Find Agent Modal */}
      <FindAgentModal
        isOpen={showFindAgentModal}
        onClose={() => setShowFindAgentModal(false)}
        apiUrl={apiUrl}
      />
    </div>
  );
};

export default SellerDashboard;
