import React from 'react';
import { Link } from 'react-router-dom';

const CTASection: React.FC = () => {
  return (
    <section className="py-16 lg:py-24 bg-blue-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Looking to Sell or Rent Your Property?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Join thousands of property owners who trust us to connect them with qualified buyers and renters. 
            List your property today and start your journey to a successful transaction.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/list-property"
              className="bg-white text-blue-600 hover:bg-gray-50 px-8 py-3 rounded-lg font-semibold text-lg transition-colors inline-flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              List Your Property Now
            </Link>
            <Link
              to="/about"
              className="text-white hover:text-blue-100 px-6 py-3 font-medium transition-colors"
            >
              Learn More About Our Process
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">2,500+</div>
              <div className="text-blue-100">Properties Listed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">98%</div>
              <div className="text-blue-100">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">24hrs</div>
              <div className="text-blue-100">Average Listing Time</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
