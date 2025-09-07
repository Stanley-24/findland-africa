import React, { useEffect, useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import HomePage from './components/home/HomePage';
import PropertyList from './components/PropertyList';
import PropertyDetail from './components/PropertyDetail';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
// import ChatPage from './components/ChatPage'; // Unused - using EnhancedChatPage instead
import EnhancedChatPage from './components/EnhancedChatPage';
import PaymentSuccess from './components/PaymentSuccess';
import About from './components/home/About';
import Contact from './components/home/Contact';
import { NotificationProvider } from './contexts/NotificationContext';
import { DataCacheProvider } from './contexts/DataCacheContext';
import { RealTimeChatProvider } from './contexts/RealTimeChatContext';
import WebSocketManager from './components/WebSocketManager';


function App() {
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  // Check authentication status on app load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      
      console.log('🔍 [AUTH] Checking authentication on app load...');
      console.log('🔍 [AUTH] Token exists:', !!token);
      console.log('🔍 [AUTH] User exists:', !!user);
      
      // If no token, user is not authenticated
      if (!token) {
        console.log('🔍 [AUTH] No token - not authenticated');
        setIsAuthenticated(false);
        setIsLoading(false);
        setAuthChecked(true);
        return;
      }

      // If we have a token but no user data, we should still validate the token
      // and fetch user data if the token is valid
      if (!user) {
        console.log('🔍 [AUTH] Token exists but no user data - will validate token and fetch user data');
      }

      try {
        console.log('🔍 [AUTH] Validating token with server...');
        console.log('🔍 [AUTH] API URL:', apiUrl);
        console.log('🔍 [AUTH] Token (first 20 chars):', token.substring(0, 20) + '...');
        
        // Validate token by making a request to get current user profile with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(`${apiUrl}/api/v1/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log('🔍 [AUTH] Response status:', response.status);
        console.log('🔍 [AUTH] Response ok:', response.ok);

        if (response.ok) {
          // Token is valid, user is authenticated
          console.log('✅ [AUTH] Token is valid - user authenticated');
          
          // If we don't have user data in localStorage, save it now
          if (!user) {
            const userData = await response.json();
            localStorage.setItem('user', JSON.stringify(userData));
            console.log('✅ [AUTH] User data saved to localStorage');
          }
          
          setIsAuthenticated(true);
        } else {
          // Token is invalid, clear auth data and redirect to login
          console.log('❌ [AUTH] Token is invalid - clearing auth data');
          console.log('❌ [AUTH] Response status:', response.status);
          const errorText = await response.text();
          console.log('❌ [AUTH] Error response:', errorText);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setIsAuthenticated(false);
        }
      } catch (error) {
        // Network error or other issue, clear auth data
        console.error('❌ [AUTH] Auth validation error:', error);
        if (error instanceof Error && error.name === 'AbortError') {
          console.error('❌ [AUTH] Request timed out');
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
      }
      
      console.log('🔍 [AUTH] Authentication check complete, setting loading to false');
      setIsLoading(false);
      setAuthChecked(true);
    };

    checkAuth();
  }, [apiUrl]);

  // Function to handle logout from child components
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setAuthChecked(true); // Ensure we don't show loading after logout
  };

  // Listen for storage changes (when token is removed in another tab)
  useEffect(() => {
    const handleStorageChange = async (e: StorageEvent) => {
      if (e.key === 'token') {
        if (!e.newValue) {
          setIsAuthenticated(false);
        } else {
          // Token was added, validate it
          try {
            const response = await fetch(`${apiUrl}/api/v1/auth/me`, {
              headers: {
                'Authorization': `Bearer ${e.newValue}`,
                'Content-Type': 'application/json',
              },
            });
            
            if (response.ok) {
              // Save user data if we don't have it
              const user = localStorage.getItem('user');
              if (!user) {
                const userData = await response.json();
                localStorage.setItem('user', JSON.stringify(userData));
              }
              setIsAuthenticated(true);
            } else {
              setIsAuthenticated(false);
            }
          } catch (error) {
            setIsAuthenticated(false);
          }
          setAuthChecked(true);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [apiUrl]);

  // Function to update authentication state (can be called from child components)
  const updateAuthState = useCallback(async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      setIsAuthenticated(false);
      setAuthChecked(true);
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/v1/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        // Save user data if we don't have it
        const user = localStorage.getItem('user');
        if (!user) {
          const userData = await response.json();
          localStorage.setItem('user', JSON.stringify(userData));
        }
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      setIsAuthenticated(false);
    }
    setAuthChecked(true);
  }, [apiUrl]);

  // Expose updateAuthState to window for child components to use
  useEffect(() => {
    (window as any).updateAuthState = updateAuthState;
    return () => {
      delete (window as any).updateAuthState;
    };
  }, [updateAuthState]);

  console.log('🚀 [AUTH] Rendering routes with authentication state:', isAuthenticated, 'authChecked:', authChecked);
  
  // Show loading spinner while checking authentication
  if (!authChecked) {
    console.log('🔄 [AUTH] Showing loading spinner while checking authentication...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Get current user ID for WebSocket connection
  const getCurrentUserId = () => {
    const user = localStorage.getItem('user');
    if (!user || user === 'undefined' || user === 'null') {
      return null;
    }
    try {
      const userData = JSON.parse(user);
      return userData?.id || null;
    } catch (error) {
      console.error('Error parsing user data for WebSocket:', error);
      return null;
    }
  };

  return (
    <NotificationProvider apiUrl={apiUrl}>
      <DataCacheProvider apiUrl={apiUrl}>
        <RealTimeChatProvider apiUrl={apiUrl} userId={getCurrentUserId()}>
          <Router
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
            <div className="App">
              {/* WebSocket Manager for real-time notifications */}
              {isAuthenticated && (
                <WebSocketManager 
                  apiUrl={apiUrl} 
                  userId={getCurrentUserId()} 
                />
              )}
          <Routes>
          {/* Public routes */}
          <Route 
            path="/" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <HomePage />} 
          />
          <Route 
            path="/properties" 
            element={<PropertyList apiUrl={apiUrl} />} 
          />
          <Route 
            path="/properties/:id" 
            element={<PropertyDetail apiUrl={apiUrl} />} 
          />
          <Route 
            path="/about" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <About />} 
          />
          <Route 
            path="/contact" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Contact />} 
          />
          
          {/* Auth routes */}
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} 
          />
          <Route 
            path="/register" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} 
          />
          
          {/* Protected routes */}
          <Route 
            path="/dashboard" 
            element={isAuthenticated ? <Dashboard apiUrl={apiUrl} onLogout={handleLogout} /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/chat/:chatRoomId" 
            element={isAuthenticated ? <EnhancedChatPage apiUrl={apiUrl} /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/property/:id" 
            element={isAuthenticated ? <PropertyDetail apiUrl={apiUrl} /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/payment-success" 
            element={isAuthenticated ? <PaymentSuccess apiUrl={apiUrl} /> : <Navigate to="/login" replace />} 
          />
          
          {/* Catch all route */}
          <Route 
            path="*" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />} 
          />
        </Routes>
      </div>
    </Router>
        </RealTimeChatProvider>
      </DataCacheProvider>
    </NotificationProvider>
  );
}

export default App;
