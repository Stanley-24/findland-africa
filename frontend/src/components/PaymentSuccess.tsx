import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

interface PaymentSuccessProps {
  apiUrl: string;
}

const PaymentSuccess: React.FC<PaymentSuccessProps> = ({ apiUrl }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const txRef = searchParams.get('tx_ref');
        const transactionId = searchParams.get('transaction_id');
        const status = searchParams.get('status');

        if (!txRef || !transactionId) {
          setError('Invalid payment response');
          setLoading(false);
          return;
        }

        // Verify payment with Flutterwave
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        // In a real implementation, you would verify the payment with Flutterwave API
        // and update the escrow status in your backend
        const response = await axios.post(
          `${apiUrl}/api/v1/escrow/verify-payment`,
          {
            tx_ref: txRef,
            transaction_id: transactionId,
            status: status
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setPaymentDetails(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error verifying payment:', err);
        setError('Failed to verify payment');
        setLoading(false);
      }
    };

    verifyPayment();
  }, [searchParams, apiUrl, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="text-green-600 text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Successful!</h2>
        <p className="text-gray-600 mb-6">
          Your payment has been processed successfully. The property purchase is now in escrow and will be completed once all conditions are met.
        </p>
        
        {paymentDetails && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-medium text-gray-900 mb-2">Transaction Details</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">Amount:</span> ₦{paymentDetails.amount?.toLocaleString()}</p>
              <p><span className="font-medium">Reference:</span> {paymentDetails.tx_ref}</p>
              <p><span className="font-medium">Status:</span> {paymentDetails.status}</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            View Dashboard
          </button>
          <button
            onClick={() => navigate('/properties')}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Browse More Properties
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
