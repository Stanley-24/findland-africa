import React from 'react';
import { Link } from 'react-router-dom';

const About: React.FC = () => {
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
            <Link
              to="/"
              className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">About FindLand Africa</h1>
          
          <div className="prose max-w-none">
            <p className="text-lg text-gray-700 mb-6">
              FindLand Africa is a comprehensive real estate platform designed specifically for the Lagos market, 
              combining property listings with secure bridging loan services to make real estate transactions 
              seamless and trustworthy.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-gray-700 mb-6">
              To revolutionize the real estate market in Lagos by providing a trusted digital platform that 
              connects property buyers, sellers, and investors with secure transactions, transparent processes, 
              and reduced risks through our integrated bridging loan services.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">What We Offer</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Verified Property Listings</h3>
                <p className="text-gray-700">
                  All properties on our platform are thoroughly verified to ensure authenticity and prevent fraud.
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Secure Transactions</h3>
                <p className="text-gray-700">
                  Our escrow system ensures secure payments and protects both buyers and sellers throughout the transaction.
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Bridging Loan Services</h3>
                <p className="text-gray-700">
                  Access to short-term financing solutions to bridge the gap between property purchase and sale.
                </p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Real-time Communication</h3>
                <p className="text-gray-700">
                  Integrated chat system for secure communication between buyers, sellers, and agents.
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">Why Choose Us?</h2>
            <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
              <li>Verified property listings with no scams</li>
              <li>Automated, legally binding contracts</li>
              <li>Access to bridging loans and financing</li>
              <li>Secure escrow payments</li>
              <li>Reduced risk for all parties</li>
              <li>Transparent pricing and processes</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Vision</h2>
            <p className="text-gray-700 mb-6">
              To become the leading real estate platform in Nigeria, starting with Lagos, and expanding 
              to other high-demand states. We aim to build trust in the real estate market through 
              technology, transparency, and secure financial services.
            </p>

            <div className="bg-blue-50 rounded-lg p-6 mt-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Get Started Today</h3>
              <p className="text-gray-700 mb-4">
                Join thousands of satisfied customers who have found their perfect property or successfully 
                sold their real estate through our platform.
              </p>
              <div className="flex space-x-4">
                <Link
                  to="/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Sign Up Now
                </Link>
                <Link
                  to="/properties"
                  className="bg-white hover:bg-gray-50 text-blue-600 border border-blue-600 px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Browse Properties
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
