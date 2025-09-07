import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserIntent, executeUserIntent } from '../utils/userIntent';
import { apiLogin, getCurrentUserProfile } from '../utils/api';
import { clearAuthData, setAuthData } from '../utils/auth';
import ErrorMessage from './common/ErrorMessage';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleDemoLogin = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Clear any existing user data to ensure fresh login
    clearAuthData();

    try {
      // Login using the new API utility
      const loginResponse = await apiLogin(email, password);
      
      if (loginResponse.success && loginResponse.data) {
        const { access_token } = loginResponse.data;
        
        // Store the token first
        localStorage.setItem('token', access_token);
        
        // Fetch user profile using the new API utility
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
            // Navigate to dashboard if no intent
            navigate('/dashboard');
          }
        } else {
          setError(userResponse.error || 'Failed to fetch user profile');
        }
      } else {
        setError(loginResponse.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo Section */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">F</span>
            </div>
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl blur opacity-30"></div>
          </div>
        </div>
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
            Welcome Back
          </h1>
          <p className="text-lg text-gray-600 font-medium">
            Sign in to FindLand Africa
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Access your account to manage properties and transactions
          </p>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/80 backdrop-blur-sm py-10 px-8 shadow-2xl border border-white/20 rounded-3xl">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && <ErrorMessage message={error} />}

            <div className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50/50 placeholder-gray-400 text-gray-900 font-medium"
                  placeholder="Enter your email address"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50/50 placeholder-gray-400 text-gray-900 font-medium"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </button>

            <div className="text-center pt-4">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200"
                >
                  Create Account
                </button>
              </p>
            </div>

            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500 font-medium">Demo Credentials</span>
                </div>
              </div>
              
              <div className="mt-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200/50 rounded-2xl p-6 shadow-lg">
                <h3 className="text-sm font-semibold text-blue-900 mb-5 text-center">Click any account to auto-fill credentials:</h3>
                <div className="grid grid-cols-1 gap-4">
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('adebayo.johnson@findland.africa', 'password123')}
                    className="group w-full text-left p-5 bg-white/90 backdrop-blur-sm border border-green-200/60 rounded-2xl hover:bg-white hover:shadow-xl hover:border-green-300/80 transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-300">
                          <span className="text-2xl">👤</span>
                        </div>
                        <div>
                          <span className="text-base font-bold text-gray-800 group-hover:text-green-700 transition-colors duration-300">Buyer</span>
                          <p className="text-xs text-gray-600 font-medium mt-1">adebayo.johnson@findland.africa</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-white font-semibold bg-green-500 px-3 py-1.5 rounded-full group-hover:bg-green-600 transition-all duration-300 shadow-sm">
                          Use
                        </span>
                        <svg className="w-3 h-3 text-green-500 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('sarah.williams@findland.africa', 'password123')}
                    className="group w-full text-left p-5 bg-white/90 backdrop-blur-sm border border-purple-200/60 rounded-2xl hover:bg-white hover:shadow-xl hover:border-purple-300/80 transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-violet-100 rounded-full flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-300">
                          <span className="text-2xl">🏠</span>
                        </div>
                        <div>
                          <span className="text-base font-bold text-gray-800 group-hover:text-purple-700 transition-colors duration-300">Seller</span>
                          <p className="text-xs text-gray-600 font-medium mt-1">sarah.williams@findland.africa</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-white font-semibold bg-purple-500 px-3 py-1.5 rounded-full group-hover:bg-purple-600 transition-all duration-300 shadow-sm">
                          Use
                        </span>
                        <svg className="w-3 h-3 text-purple-500 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('michael.okafor@findland.africa', 'password123')}
                    className="group w-full text-left p-5 bg-white/90 backdrop-blur-sm border border-orange-200/60 rounded-2xl hover:bg-white hover:shadow-xl hover:border-orange-300/80 transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-300">
                          <span className="text-2xl">🤝</span>
                        </div>
                        <div>
                          <span className="text-base font-bold text-gray-800 group-hover:text-orange-700 transition-colors duration-300">Agent</span>
                          <p className="text-xs text-gray-600 font-medium mt-1">michael.okafor@findland.africa</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-white font-semibold bg-orange-500 px-3 py-1.5 rounded-full group-hover:bg-orange-600 transition-all duration-300 shadow-sm">
                          Use
                        </span>
                        <svg className="w-3 h-3 text-orange-500 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('grace.adebayo@findland.africa', 'password123')}
                    className="group w-full text-left p-5 bg-white/90 backdrop-blur-sm border border-red-200/60 rounded-2xl hover:bg-white hover:shadow-xl hover:border-red-300/80 transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-rose-100 rounded-full flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-300">
                          <span className="text-2xl">⚙️</span>
                        </div>
                        <div>
                          <span className="text-base font-bold text-gray-800 group-hover:text-red-700 transition-colors duration-300">Admin</span>
                          <p className="text-xs text-gray-600 font-medium mt-1">grace.adebayo@findland.africa</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-white font-semibold bg-red-500 px-3 py-1.5 rounded-full group-hover:bg-red-600 transition-all duration-300 shadow-sm">
                          Use
                        </span>
                        <svg className="w-3 h-3 text-red-500 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                </div>
                <div className="mt-6 p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200/40 shadow-sm">
                  <div className="flex items-center justify-center space-x-2 mb-3">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    <p className="text-sm text-blue-800 font-semibold">
                      <strong>Password for all accounts:</strong> 
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-md font-mono text-xs">password123</span>
                    </p>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200/60 rounded-xl">
                    <div className="flex items-start space-x-2">
                      <svg className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs text-yellow-800 font-medium">
                        <strong>Note:</strong> If you see the wrong dashboard, clear your browser data or try incognito mode.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
