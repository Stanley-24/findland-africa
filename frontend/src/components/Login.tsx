import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserIntent, executeUserIntent } from '../utils/userIntent';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  const handleDemoLogin = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Clear any existing user data to ensure fresh login
    localStorage.removeItem('user');
    localStorage.removeItem('token');

    try {
      const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: email,
          password: password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.access_token);
        
        // Fetch user profile to get user data
        const userResponse = await fetch(`${apiUrl}/api/v1/auth/me`, {
          headers: {
            'Authorization': `Bearer ${data.access_token}`,
          },
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          localStorage.setItem('user', JSON.stringify(userData));
          
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
          setError('Failed to fetch user profile');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">F</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Sign in to FindLand Africa
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Access your account to manage properties and transactions
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Sign up
                </button>
              </p>
            </div>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Demo Credentials</span>
                </div>
              </div>
              
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-3">Click any account to auto-fill credentials:</h3>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('adebayo.johnson@findland.africa', 'password123')}
                    className="w-full text-left p-2 bg-white border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-blue-800">👤 Buyer</span>
                        <p className="text-xs text-blue-600">adebayo.johnson@findland.africa</p>
                      </div>
                      <span className="text-xs text-blue-500">Click to use</span>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('sarah.williams@findland.africa', 'password123')}
                    className="w-full text-left p-2 bg-white border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-blue-800">🏠 Seller</span>
                        <p className="text-xs text-blue-600">sarah.williams@findland.africa</p>
                      </div>
                      <span className="text-xs text-blue-500">Click to use</span>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('michael.okafor@findland.africa', 'password123')}
                    className="w-full text-left p-2 bg-white border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-blue-800">🤝 Agent</span>
                        <p className="text-xs text-blue-600">michael.okafor@findland.africa</p>
                      </div>
                      <span className="text-xs text-blue-500">Click to use</span>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('grace.adebayo@findland.africa', 'password123')}
                    className="w-full text-left p-2 bg-white border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-blue-800">⚙️ Admin</span>
                        <p className="text-xs text-blue-600">grace.adebayo@findland.africa</p>
                      </div>
                      <span className="text-xs text-blue-500">Click to use</span>
                    </div>
                  </button>
                </div>
                <p className="mt-3 text-xs text-blue-600 text-center">
                  <strong>Password for all accounts:</strong> password123
                </p>
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                  <strong>Note:</strong> If you see the wrong dashboard, clear your browser data or try incognito mode.
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
