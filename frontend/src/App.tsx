import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import HomePage from './components/HomePage';
import PropertyList from './components/PropertyList';
import PropertyDetail from './components/PropertyDetail';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import ChatPage from './components/ChatPage';
import PaymentSuccess from './components/PaymentSuccess';
import About from './components/About';
import Contact from './components/Contact';
import { NotificationProvider } from './contexts/NotificationContext';
import WebSocketManager from './components/WebSocketManager';

function App() {
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on app load
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      setIsAuthenticated(!!(token && user));
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // Function to handle logout from child components
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
  };

  // Listen for storage changes (when token is removed in another tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        if (!e.newValue) {
          setIsAuthenticated(false);
        } else {
          // Token was added, check if user data exists too
          const user = localStorage.getItem('user');
          setIsAuthenticated(!!user);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Function to update authentication state (can be called from child components)
  const updateAuthState = () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    setIsAuthenticated(!!(token && user));
  };

  // Expose updateAuthState to window for child components to use
  useEffect(() => {
    (window as any).updateAuthState = updateAuthState;
    return () => {
      delete (window as any).updateAuthState;
    };
  }, []);

  // Show loading spinner while checking authentication
  if (isLoading) {
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
    if (user) {
      try {
        return JSON.parse(user).id;
      } catch {
        return null;
      }
    }
    return null;
  };

  return (
    <NotificationProvider apiUrl={apiUrl}>
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
          {/* Redirect authenticated users to dashboard */}
          <Route 
            path="/" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <HomePage />} 
          />
          <Route 
            path="/properties" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <PropertyList apiUrl={apiUrl} />} 
          />
          <Route 
            path="/properties/:id" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <PropertyDetail apiUrl={apiUrl} />} 
          />
          <Route 
            path="/about" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <About />} 
          />
          <Route 
            path="/contact" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Contact />} 
          />
          
          {/* Auth routes - redirect to dashboard if already authenticated */}
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} 
          />
          <Route 
            path="/register" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} 
          />
          
          {/* Dashboard - redirect to login if not authenticated */}
          <Route 
            path="/dashboard" 
            element={isAuthenticated ? <Dashboard apiUrl={apiUrl} onLogout={handleLogout} /> : <Navigate to="/login" replace />} 
          />
          
          {/* Chat Page - redirect to login if not authenticated */}
          <Route 
            path="/chat/:chatRoomId" 
            element={isAuthenticated ? <ChatPage apiUrl={apiUrl} /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/property/:id" 
            element={isAuthenticated ? <PropertyDetail apiUrl={apiUrl} /> : <Navigate to="/login" replace />} 
          />
          
          {/* Payment Success Page - redirect to login if not authenticated */}
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
    </NotificationProvider>
  );
}

export default App;
