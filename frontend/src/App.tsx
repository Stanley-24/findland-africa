import React, { useState, useEffect } from 'react';
import './App.css';

interface ApiStatus {
  message: string;
  status: string;
  timestamp: string;
  version: string;
}

function App() {
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApiStatus = async () => {
      try {
        const response = await fetch('http://localhost:8000/');
        if (!response.ok) {
          throw new Error('Failed to fetch API status');
        }
        const data = await response.json();
        setApiStatus(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchApiStatus();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            🏗️ FindLand Africa
          </h1>
          <p className="text-xl text-gray-600">
            Real Estate Bridging Loan Platform - MVP
          </p>
        </header>

        <main className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              API Status
            </h2>
            
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Connecting to API...</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="text-red-600 text-xl mr-3">⚠️</div>
                  <div>
                    <h3 className="text-red-800 font-semibold">Connection Error</h3>
                    <p className="text-red-600">{error}</p>
                    <p className="text-sm text-red-500 mt-2">
                      Make sure the backend server is running on http://localhost:8000
                    </p>
                  </div>
                </div>
              </div>
            )}

            {apiStatus && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="text-green-600 text-2xl mr-3">✅</div>
                  <div>
                    <h3 className="text-green-800 font-semibold text-lg">
                      {apiStatus.message}
                    </h3>
                    <p className="text-green-600">
                      Status: <span className="font-medium">{apiStatus.status}</span>
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Version:</span>
                    <span className="ml-2 text-gray-600">{apiStatus.version}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Timestamp:</span>
                    <span className="ml-2 text-gray-600">
                      {new Date(apiStatus.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                🚀 MVP Features
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li>✅ Hello World API</li>
                <li>🔄 User Authentication (Planned)</li>
                <li>🏠 Property Listings (Planned)</li>
                <li>💰 Escrow System (Planned)</li>
                <li>💬 Real-time Chat (Planned)</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                📊 Project Status
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Phase:</span>
                  <span className="font-medium text-blue-600">Hello World</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Budget:</span>
                  <span className="font-medium text-green-600">$200-500/month</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Target:</span>
                  <span className="font-medium text-purple-600">₦500M loans</span>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="text-center mt-12 text-gray-500">
          <p>FindLand Africa - Building the future of real estate in Lagos</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
