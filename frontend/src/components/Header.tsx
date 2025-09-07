import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NotificationBadge from './NotificationBadge';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      // You can decode the JWT token to get user info or make an API call
      // For now, we'll just set a basic user object
      setUser({ name: 'User', email: 'user@example.com' });
    }
  }, []);


  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
    navigate('/');
  };

  const handleBuySell = () => {
    navigate('/register');
  };

  const handleRent = () => {
    navigate('/properties?type=rent');
  };

  const handleContactAgent = () => {
    navigate('/register');
  };

  const handleListProperty = () => {
    navigate('/register');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                <span className="text-white font-bold text-lg">F</span>
              </div>
              <span className="text-lg sm:text-xl font-bold text-gray-900 hidden sm:block">FindLand Africa</span>
              <span className="text-lg font-bold text-gray-900 sm:hidden">FindLand</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-4 lg:space-x-6">
            <button
              onClick={handleBuySell}
              className="text-gray-700 hover:text-blue-600 px-2 lg:px-3 py-2 text-sm font-medium transition-colors"
            >
              Buy/Sell
            </button>
            <button
              onClick={handleRent}
              className="text-gray-700 hover:text-blue-600 px-2 lg:px-3 py-2 text-sm font-medium transition-colors"
            >
              Rent
            </button>
            <button
              onClick={handleContactAgent}
              className="text-gray-700 hover:text-blue-600 px-2 lg:px-3 py-2 text-sm font-medium transition-colors"
            >
              <span className="hidden lg:inline">Contact Agent</span>
              <span className="lg:hidden">Agent</span>
            </button>
            <Link 
              to="/about" 
              className="text-gray-700 hover:text-blue-600 px-2 lg:px-3 py-2 text-sm font-medium transition-colors"
            >
              About
            </Link>
            <Link 
              to="/contact" 
              className="text-gray-700 hover:text-blue-600 px-2 lg:px-3 py-2 text-sm font-medium transition-colors"
            >
              Contact
            </Link>
          </nav>

          {/* User Actions */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <button
              onClick={handleListProperty}
              className="bg-blue-600 hover:bg-blue-700 text-white px-2 lg:px-3 py-1.5 lg:py-2 rounded-md text-xs lg:text-sm font-medium transition-colors"
            >
              <span className="hidden lg:inline">List Property</span>
              <span className="lg:hidden">List</span>
            </button>
            {isAuthenticated && (
              <>
                <div className="flex items-center space-x-1">
                  <span className="text-gray-700 text-xs lg:text-sm font-medium hidden xl:inline">
                    Welcome, {user?.name || 'User'}!
                  </span>
                  <span className="text-gray-700 text-xs lg:text-sm font-medium xl:hidden">
                    Hi, {user?.name?.split(' ')[0] || 'User'}!
                  </span>
                  <NotificationBadge />
                </div>
                <Link 
                  to="/dashboard" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 lg:py-2 rounded-md text-xs lg:text-sm font-medium transition-colors"
                >
                  <span className="hidden lg:inline">Dashboard</span>
                  <span className="lg:hidden">Dash</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-700 hover:text-red-600 px-2 py-1.5 lg:py-2 text-xs lg:text-sm font-medium transition-colors"
                >
                  <span className="hidden lg:inline">Logout</span>
                  <span className="lg:hidden">Exit</span>
                </button>
              </>
            )}
          </div>

          {/* Mobile Actions */}
          <div className="md:hidden flex items-center space-x-1">
            {isAuthenticated && (
              <>
                <Link 
                  to="/dashboard" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                >
                  Dash
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-red-600 hover:text-red-700 px-1 py-1 text-xs font-medium transition-colors"
                >
                  Exit
                </button>
              </>
            )}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-blue-600 p-1.5"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50">
              <button
                onClick={() => {
                  handleBuySell();
                  setIsMenuOpen(false);
                }}
                className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium w-full text-left"
              >
                Buy/Sell
              </button>
              <button
                onClick={() => {
                  handleRent();
                  setIsMenuOpen(false);
                }}
                className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium w-full text-left"
              >
                Rent
              </button>
              <button
                onClick={() => {
                  handleContactAgent();
                  setIsMenuOpen(false);
                }}
                className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium w-full text-left"
              >
                Contact Agent
              </button>
              <Link 
                to="/about" 
                className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </Link>
              <Link 
                to="/contact" 
                className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>
              <div className="border-t border-gray-200 pt-4">
                <button
                  onClick={() => {
                    handleListProperty();
                    setIsMenuOpen(false);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white block px-3 py-2 rounded-md text-base font-medium w-full mb-4"
                >
                  List Property
                </button>
                {isAuthenticated && (
                  <>
                    <div className="px-3 py-2 bg-blue-50 rounded-lg mb-2">
                      <span className="text-blue-800 block text-base font-semibold">
                        Welcome back, {user?.name || 'User'}! 👋
                      </span>
                      <div className="mt-2">
                        <NotificationBadge />
                      </div>
                    </div>
                    <Link 
                      to="/dashboard" 
                      className="bg-blue-600 hover:bg-blue-700 text-white block px-3 py-2 rounded-md text-base font-medium w-full text-center mb-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Go to Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                      className="text-gray-700 hover:text-red-600 block px-3 py-2 text-base font-medium w-full text-left"
                    >
                      Logout
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
