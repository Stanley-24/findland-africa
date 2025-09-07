import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SellerDashboard from './seller/SellerDashboard';
import AgentDashboard from './agent/AgentDashboard';
import BuyerDashboard from './buyer/BuyerDashboard';
import AdminDashboard from './admin/AdminDashboard';
import { getCurrentUserProfile, apiGet } from '../utils/api';
import { getAuthToken } from '../utils/auth';
import LoadingSpinner from './common/LoadingSpinner';
import ErrorMessage from './common/ErrorMessage';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'buyer' | 'seller' | 'agent' | 'admin';
  phone_number?: string;
  is_active: boolean;
  is_verified: boolean;
}

interface DashboardProps {
  apiUrl: string;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ apiUrl, onLogout }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [agentApplication, setAgentApplication] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const checkAgentApplication = React.useCallback(async (token: string) => {
    try {
      const response = await apiGet('/api/v1/agent-applications/my-application');

      if (response.success && response.data) {
        setAgentApplication(response.data);
        return response.data;
      } else if (response.error && response.error.includes('404')) {
        // No agent application found, which is fine
        setAgentApplication(null);
        return null;
      } else {
        // Other errors - log but don't show to user
        console.log('Error checking agent application:', response.error);
        setAgentApplication(null);
        return null;
      }
    } catch (err) {
      // Ignore errors when checking for agent application
      console.log('No agent application found or error checking:', err);
      setAgentApplication(null);
      return null;
    }
  }, []);

  // Function to manually check agent application (can be called from child components)
  const handleCheckAgentApplication = React.useCallback(async () => {
    const token = getAuthToken();
    if (token && user?.role === 'buyer') {
      return await checkAgentApplication(token);
    }
    return null;
  }, [checkAgentApplication, user?.role]);

  const fetchUserProfile = React.useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        navigate('/login');
        return;
      }

      // Clear session storage but keep user data in localStorage
      // The user data will be updated with fresh data from the API response
      sessionStorage.clear();
      
      // Make a direct API call instead of using the cached version
      const response = await getCurrentUserProfile();

      if (!response.success) {
        if (response.error && response.error.includes('401')) {
          onLogout();
          return;
        }
        throw new Error(response.error || 'Failed to fetch user profile');
      }

      setUser(response.data);
      
      // Update localStorage with fresh user data
      localStorage.setItem('user', JSON.stringify(response.data));
      
      // Don't automatically check for agent applications to avoid unnecessary 404 errors
      // Agent applications will be checked only when explicitly needed (e.g., when user applies)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching user profile:', err);
    } finally {
      setLoading(false);
    }
  }, [navigate, onLogout]);

  useEffect(() => {
    fetchUserProfile();
    
    // Check if user came from registration
    if (location.state?.message) {
      setShowWelcomeMessage(true);
      // Clear the message from location state
      navigate(location.pathname, { replace: true });
    }
  }, [fetchUserProfile, navigate, location.pathname, location.state?.message]); // Include all dependencies


  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    onLogout();
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <ErrorMessage 
            message={error || 'Unable to load your profile. Please try logging in again.'}
            className="mb-6"
          />
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Render pending approval dashboard for buyers with agent applications
  const renderPendingApprovalDashboard = () => {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="text-blue-600 text-6xl mb-4">⏳</div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Agent Application Pending Review
              </h1>
              <p className="text-lg text-gray-600 mb-6">
                Thank you for your interest in becoming a real estate agent! Your application has been submitted and is currently under review by our admin team.
              </p>
              
              {agentApplication && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">Application Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    <div>
                      <span className="font-medium text-blue-800">Status:</span>
                      <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                        {agentApplication.status}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800">Submitted:</span>
                      <span className="ml-2 text-blue-700">
                        {new Date(agentApplication.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {agentApplication.company_name && (
                      <div>
                        <span className="font-medium text-blue-800">Company:</span>
                        <span className="ml-2 text-blue-700">{agentApplication.company_name}</span>
                      </div>
                    )}
                    {agentApplication.years_experience && (
                      <div>
                        <span className="font-medium text-blue-800">Experience:</span>
                        <span className="ml-2 text-blue-700">{agentApplication.years_experience}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">What happens next?</h3>
                <ul className="text-left text-gray-600 space-y-2">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Our admin team will review your application within 2-3 business days
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    You'll receive an email notification once your application is reviewed
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    If approved, your account will be upgraded to agent status
                  </li>
                </ul>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => navigate('/properties')}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Browse Properties
                </button>
                <button
                  onClick={confirmLogout}
                  className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render appropriate dashboard based on user role
  const renderDashboard = () => {
    // Only show pending approval dashboard if we have agent application data
    // This prevents showing it when we haven't checked for applications
    if (user.role === 'buyer' && agentApplication && agentApplication.status === 'pending') {
      return renderPendingApprovalDashboard();
    }
    switch (user.role) {
      case 'seller':
        return <SellerDashboard user={user} apiUrl={apiUrl} onLogout={confirmLogout} />;
      case 'agent':
        return <AgentDashboard user={user} apiUrl={apiUrl} onLogout={confirmLogout} />;
      case 'buyer':
        return <BuyerDashboard user={user} apiUrl={apiUrl} onLogout={confirmLogout} onCheckAgentApplication={handleCheckAgentApplication} />;
      case 'admin':
        return <AdminDashboard user={user} apiUrl={apiUrl} onLogout={confirmLogout} />;
      default:
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="text-yellow-600 text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Unknown Role</h2>
              <p className="text-gray-600 mb-6">
                Your account has an unrecognized role. Please contact support.
              </p>
              <button
                onClick={handleLogout}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div>
      {showWelcomeMessage && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
                <strong>Welcome to your dashboard!</strong> Your account has been created successfully. 
                You can now track your applications and manage your property interests.
              </p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={() => setShowWelcomeMessage(false)}
                  className="inline-flex bg-green-50 rounded-md p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-50 focus:ring-green-600"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {renderDashboard()}
      
      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Confirm Logout</h3>
              </div>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                Are you sure you want to logout? You will need to login again to access your dashboard.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
