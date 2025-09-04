import React from 'react';
import Header from './Header';
import HeroSection from './HeroSection';
import FeaturesSection from './FeaturesSection';
import PropertiesShowcase from './PropertiesShowcase';
import CTASection from './CTASection';
import Footer from './Footer';

const HomePage: React.FC = () => {
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <PropertiesShowcase apiUrl={apiUrl} />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;
