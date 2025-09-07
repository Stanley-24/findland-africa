import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TabComponentProps, Trade } from '../../types/buyerDashboard';
import { formatPrice } from '../../utils/textUtils';
import { formatDate } from '../../utils/dateUtils';

interface TradesTabProps extends TabComponentProps {
  applications: Trade[];
}

const TradesTab: React.FC<TradesTabProps> = ({ applications }) => {
  const navigate = useNavigate();

  // Using shared formatPrice and formatDate utilities

  const getTradeStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTradeStatusDescription = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'Your trade is being processed. Please wait for confirmation.';
      case 'completed':
        return 'Your trade has been completed successfully.';
      case 'cancelled':
        return 'Your trade has been cancelled.';
      default:
        return 'Trade status is unknown.';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Trades</h2>
        <Link
          to="/properties"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Browse Properties →
        </Link>
      </div>

      {applications.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Trades Yet</h3>
          <p className="text-gray-600 mb-4">You haven't initiated any property trades yet.</p>
          <Link
            to="/properties"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            Browse Properties
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => (
            <div key={application.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{application.property_title || 'Property Not Found'}</h3>
                  <p className="text-gray-600">{application.property_location || 'Location Unknown'}</p>
                </div>
                <div className="flex space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTradeStatusColor(application.status)}`}>
                    {application.status.replace('_', ' ')}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    {application.type?.replace('_', ' ') || 'property purchase'}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Transaction Type</span>
                  <p className="text-gray-900 capitalize">{application.type?.replace('_', ' ') || 'Property Purchase'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Amount</span>
                  <p className="text-gray-900 font-semibold">{formatPrice(application.price)}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Agent</span>
                  <p className="text-gray-900">{application.agent_name || 'Unknown'}</p>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Status:</span> {getTradeStatusDescription(application.status)}
                </p>
              </div>
              
              <div className="flex justify-between items-center text-sm text-gray-500">
                <div>
                  <span>Trade ID: {application.id.slice(0, 8)}...</span>
                  <span className="ml-4">Created: {formatDate(application.created_at)}</span>
                </div>
                <div className="space-x-2">
                  {application.property_id && (
                    <Link
                      to={`/property/${application.property_id}`}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View Property
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      // Navigate to chat room for this trade
                      const chatRoomId = crypto.randomUUID();
                      navigate(`/chat/${chatRoomId}`);
                    }}
                    className="text-green-600 hover:text-green-700 font-medium"
                  >
                    Chat
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TradesTab;
