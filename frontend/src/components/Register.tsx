import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getUserIntent, executeUserIntent } from '../utils/userIntent';
import { apiPost, apiLogin, getCurrentUserProfile } from '../utils/api';
import { setAuthData } from '../utils/auth';
import AgentApplicationForm from './agent/AgentApplicationForm';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'buyer' as 'buyer' | 'seller' | 'agent' | 'admin'
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPrefilled, setIsPrefilled] = useState(false);
  const [showAgentApplication, setShowAgentApplication] = useState(false);
  const navigate = useNavigate();

  // Pre-fill form data from localStorage if coming from application submission
  useEffect(() => {
    const signupEmail = localStorage.getItem('signupEmail');
    const signupName = localStorage.getItem('signupName');
    
    if (signupEmail || signupName) {
      setFormData(prev => ({
        ...prev,
        email: signupEmail || '',
        name: signupName || ''
      }));
      setIsPrefilled(true);
      
      // Clear the stored data after using it
      localStorage.removeItem('signupEmail');
      localStorage.removeItem('signupName');
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Basic validation for phone number field
    if (name === 'phone' && value) {
      // Check if user accidentally entered an email in phone field
      if (value.includes('@') || value.includes('.com') || value.includes('.africa')) {
        setError('Please enter a valid phone number, not an email address');
        return;
      }
    }
    
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      // Register user using the new API utility
      const registerResponse = await apiPost('/api/v1/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone_number: formData.phone,
        role: formData.role
      });

      if (!registerResponse.success) {
        throw new Error(registerResponse.error || 'Registration failed');
      }

      // Registration successful, automatically log the user in
      const loginResponse = await apiLogin(formData.email, formData.password);

      if (loginResponse.success && loginResponse.data) {
        const { access_token } = loginResponse.data;
        
        // Store the token first
        localStorage.setItem('token', access_token);
        
        // Fetch user profile to get user data
        const userResponse = await getCurrentUserProfile();
        
        if (userResponse.success && userResponse.data) {
          setAuthData(access_token, userResponse.data);
          
          // Update authentication state in App component
          if ((window as any).updateAuthState) {
            (window as any).updateAuthState();
          }
        
          // Check for saved user intent and execute it
          const userIntent = getUserIntent();
          if (userIntent) {
            executeUserIntent(userIntent, navigate);
          } else {
            // Redirect to dashboard if no intent with role-specific message
            const roleMessages = {
              buyer: 'Account created successfully! Welcome to your buyer dashboard. Start exploring properties!',
              seller: 'Account created successfully! Welcome to your seller dashboard. List your properties!',
              agent: 'Account created successfully! Welcome to your agent dashboard. Manage your clients!',
              admin: 'Account created successfully! Welcome to your admin dashboard. Manage the platform!'
            };
            
            navigate('/dashboard', { 
              state: { 
                message: roleMessages[formData.role] || 'Account created successfully! Welcome to your dashboard.' 
              } 
            });
          }
        } else {
          setError(userResponse.error || 'Failed to fetch user profile');
        }
      } else {
        // If auto-login fails, redirect to login page
        navigate('/login', { 
          state: { 
            message: 'Registration successful! Please login with your credentials.' 
          } 
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg w-full mx-auto">
          {/* Header Section */}
          <div className="text-center mb-6">
            <div className="mx-auto h-12 w-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="mt-4 text-center text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Create your account
            </h2>
            <p className="mt-2 text-center text-base text-gray-600">
              Or{' '}
              <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200">
                sign in to your existing account
              </Link>
            </p>
          </div>

          {/* Success Message */}
          {isPrefilled && (
            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-sm">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-800 font-medium">
                    <strong>Application submitted successfully!</strong> Your details have been pre-filled. 
                    Complete your account setup to track your applications.
                  </p>
                </div>
              </div>
            </div>
          )}
          {/* Main Form */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Full Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm text-gray-900 placeholder-gray-500"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm text-gray-900 placeholder-gray-500"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              {/* Account Type */}
              <div>
                <label htmlFor="role" className="block text-sm font-semibold text-gray-700 mb-1">
                  Account Type
                </label>
                <select
                  id="role"
                  name="role"
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm text-gray-900"
                  value={formData.role}
                  onChange={handleChange}
                >
                  <option value="buyer">🏠 Buyer/Renter - Looking to buy or rent properties</option>
                  <option value="seller">🏘️ Seller - Want to sell my property</option>
                </select>
              </div>

              {/* Phone Number */}
              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-1">
                  Phone Number <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm text-gray-900 placeholder-gray-500"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm text-gray-900 placeholder-gray-500"
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm text-gray-900 placeholder-gray-500"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-4 shadow-sm">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-semibold text-red-800">Error</h3>
                      <div className="mt-1 text-sm text-red-700">
                        <p>{error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3 px-6 border border-transparent text-base font-semibold rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating account...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <span>Create Account</span>
                      <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Terms and Privacy */}
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              By creating an account, you agree to our{' '}
              <button className="font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200">
                Terms of Service
              </button>{' '}
              and{' '}
              <button className="font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200">
                Privacy Policy
              </button>
            </p>
          </div>

          {/* Professional Roles Information */}
          <div className="mt-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200/50 rounded-2xl p-5 shadow-lg">
            <h3 className="text-lg font-bold text-blue-900 mb-3 text-center">Interested in Professional Roles?</h3>
            <div className="space-y-3">
              <div className="group p-3 bg-white/80 backdrop-blur-sm border border-blue-200/60 rounded-xl hover:bg-white hover:shadow-md hover:border-blue-300/80 transition-all duration-300">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-xl">🤝</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-gray-800 group-hover:text-orange-700 transition-colors duration-300">Real Estate Agent</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Join our network of verified real estate professionals. Contact us to apply for agent status.
                    </p>
                    <button 
                      onClick={() => setShowAgentApplication(true)}
                      className="mt-1 text-xs text-orange-600 font-semibold hover:text-orange-700 transition-colors duration-200 flex items-center"
                    >
                      Apply to become an Agent
                      <svg className="ml-1 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="group p-3 bg-white/80 backdrop-blur-sm border border-blue-200/60 rounded-xl hover:bg-white hover:shadow-md hover:border-blue-300/80 transition-all duration-300">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-rose-100 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-xl">⚙️</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-gray-800 group-hover:text-red-700 transition-colors duration-300">Platform Administrator</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Administrative access is granted by invitation only. Contact support for more information.
                    </p>
                    <button className="mt-1 text-xs text-red-600 font-semibold hover:text-red-700 transition-colors duration-200 flex items-center">
                      Contact Support
                      <svg className="ml-1 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">Demo Accounts Available</span>
              </div>
            </div>
            
            <div className="mt-4 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border border-green-200/50 rounded-2xl p-4 shadow-lg">
              <h3 className="text-sm font-semibold text-green-900 mb-3 text-center">Demo accounts available for testing:</h3>
              <div className="grid grid-cols-1 gap-2">
                <div className="group p-3 bg-white/90 backdrop-blur-sm border border-green-200/60 rounded-xl hover:bg-white hover:shadow-md hover:border-green-300/80 transition-all duration-300 transform hover:scale-[1.01]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-xl">👤</span>
                      </div>
                      <div>
                        <span className="text-sm font-bold text-gray-800">Buyer/Renter</span>
                        <p className="text-xs text-gray-600 font-medium">adebayo.johnson@findland.africa</p>
                      </div>
                    </div>
                    <Link to="/login" className="text-xs text-white font-semibold bg-green-500 px-3 py-1.5 rounded-full hover:bg-green-600 transition-all duration-300 shadow-sm">
                      Login
                    </Link>
                  </div>
                </div>
                
                <div className="group p-3 bg-white/90 backdrop-blur-sm border border-purple-200/60 rounded-xl hover:bg-white hover:shadow-md hover:border-purple-300/80 transition-all duration-300 transform hover:scale-[1.01]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-violet-100 rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-xl">🏠</span>
                      </div>
                      <div>
                        <span className="text-sm font-bold text-gray-800">Seller</span>
                        <p className="text-xs text-gray-600 font-medium">sarah.williams@findland.africa</p>
                      </div>
                    </div>
                    <Link to="/login" className="text-xs text-white font-semibold bg-purple-500 px-3 py-1.5 rounded-full hover:bg-purple-600 transition-all duration-300 shadow-sm">
                      Login
                    </Link>
                  </div>
                </div>
                
                <div className="group p-3 bg-white/90 backdrop-blur-sm border border-orange-200/60 rounded-xl hover:bg-white hover:shadow-md hover:border-orange-300/80 transition-all duration-300 transform hover:scale-[1.01]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-xl">🤝</span>
                      </div>
                      <div>
                        <span className="text-sm font-bold text-gray-800">Agent (Restricted)</span>
                        <p className="text-xs text-gray-600 font-medium">michael.okafor@findland.africa</p>
                      </div>
                    </div>
                    <Link to="/login" className="text-xs text-white font-semibold bg-orange-500 px-3 py-1.5 rounded-full hover:bg-orange-600 transition-all duration-300 shadow-sm">
                      Login
                    </Link>
                  </div>
                </div>
                
                <div className="group p-3 bg-white/90 backdrop-blur-sm border border-red-200/60 rounded-xl hover:bg-white hover:shadow-md hover:border-red-300/80 transition-all duration-300 transform hover:scale-[1.01]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-rose-100 rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-xl">⚙️</span>
                      </div>
                      <div>
                        <span className="text-sm font-bold text-gray-800">Admin (Restricted)</span>
                        <p className="text-xs text-gray-600 font-medium">grace.adebayo@findland.africa</p>
                      </div>
                    </div>
                    <Link to="/login" className="text-xs text-white font-semibold bg-red-500 px-3 py-1.5 rounded-full hover:bg-red-600 transition-all duration-300 shadow-sm">
                      Login
                    </Link>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-green-200/40 shadow-sm">
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  <p className="text-sm text-green-800 font-semibold">
                    <strong>Password for all accounts:</strong> 
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 rounded-md font-mono text-xs">password123</span>
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200/60 rounded-xl">
                  <div className="flex items-start space-x-2">
                    <svg className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-yellow-800 font-medium">
                      <strong>Note:</strong> Agent and Admin roles are restricted and require approval
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Agent Application Modal */}
      {showAgentApplication && (
        <AgentApplicationForm onClose={() => setShowAgentApplication(false)} />
      )}
    </>
  );
};

export default Register;
