import React, { useState } from 'react';

import { useNavigate } from 'react-router-dom';

interface AgentApplicationFormProps {
  onClose: () => void;
}

const AgentApplicationForm: React.FC<AgentApplicationFormProps> = ({ onClose }) => {
  const [formData, setFormData] = useState({
    // Account creation fields
    name: '',
    email: '',
    phone_number: '',
    password: '',
    confirmPassword: '',
    
    // Agent application fields
    company_name: '',
    license_number: '',
    years_experience: '',
    specializations: [] as string[],
    portfolio_url: '',
    linkedin_url: '',
    motivation: '',
    references: [] as Array<{name: string, email: string, phone: string}>
  });
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const navigate = useNavigate();
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  const specializationOptions = [
    'Residential Sales',
    'Commercial Real Estate',
    'Property Management',
    'Real Estate Investment',
    'Luxury Properties',
    'First-time Buyers',
    'Rental Properties',
    'Land Development',
    'Real Estate Consulting',
    'Property Valuation'
  ];

  const experienceOptions = [
    'Less than 1 year',
    '1-2 years',
    '3-5 years',
    '6-10 years',
    '11-15 years',
    '16-20 years',
    'More than 20 years'
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSpecializationChange = (specialization: string) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.includes(specialization)
        ? prev.specializations.filter(s => s !== specialization)
        : [...prev.specializations, specialization]
    }));
  };

  const addReference = () => {
    setFormData(prev => ({
      ...prev,
      references: [...prev.references, { name: '', email: '', phone: '' }]
    }));
  };

  const removeReference = (index: number) => {
    setFormData(prev => ({
      ...prev,
      references: prev.references.filter((_, i) => i !== index)
    }));
  };

  const updateReference = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      references: prev.references.map((ref, i) => 
        i === index ? { ...ref, [field]: value } : ref
      )
    }));
  };

  const validateStep1 = () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.motivation.trim()) {
      setError('Motivation is required');
      return false;
    }
    if (formData.motivation.length < 50) {
      setError('Motivation must be at least 50 characters long');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateStep1() || !validateStep2()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/v1/auth/register-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone_number: formData.phone_number || null,
          password: formData.password,
          company_name: formData.company_name || null,
          license_number: formData.license_number || null,
          years_experience: formData.years_experience || null,
          specializations: formData.specializations.length > 0 ? formData.specializations : null,
          portfolio_url: formData.portfolio_url || null,
          linkedin_url: formData.linkedin_url || null,
          motivation: formData.motivation,
          references: formData.references.length > 0 ? formData.references : null
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Registration error:', data);
        if (data.detail && Array.isArray(data.detail)) {
          // Handle validation errors
          const errorMessages = data.detail.map((error: any) => `${error.loc?.join('.')}: ${error.msg}`).join(', ');
          throw new Error(`Validation error: ${errorMessages}`);
        }
        throw new Error(data.detail || 'Failed to submit application');
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        navigate('/login', { 
          state: { 
            message: 'Account created successfully! Your agent application is pending admin review. Please log in to check your status.' 
          } 
        });
      }, 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (validateStep1()) {
      setCurrentStep(2);
      setError(null);
    }
  };

  const prevStep = () => {
    setCurrentStep(1);
    setError(null);
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6 text-center">
          <div className="text-green-500 text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Application Submitted!</h2>
          <p className="text-gray-600 mb-6">
            Your account has been created and your agent application has been submitted. 
            You'll be redirected to the login page shortly.
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Apply to Become an Agent
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Progress indicator */}
          <div className="mb-6">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <div className={`flex-1 h-1 mx-2 ${
                currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'
              }`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-600">
              <span>Account Details</span>
              <span>Application Details</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
                
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone_number"
                    name="phone_number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    required
                    minLength={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Next Step
                  </button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Professional Information</h3>
                
                <div>
                  <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="company_name"
                    name="company_name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.company_name}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label htmlFor="license_number" className="block text-sm font-medium text-gray-700 mb-1">
                    Real Estate License Number
                  </label>
                  <input
                    type="text"
                    id="license_number"
                    name="license_number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.license_number}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label htmlFor="years_experience" className="block text-sm font-medium text-gray-700 mb-1">
                    Years of Experience
                  </label>
                  <select
                    id="years_experience"
                    name="years_experience"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.years_experience}
                    onChange={handleInputChange}
                  >
                    <option value="">Select experience level</option>
                    {experienceOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Specializations
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {specializationOptions.map(specialization => (
                      <label key={specialization} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.specializations.includes(specialization)}
                          onChange={() => handleSpecializationChange(specialization)}
                          className="mr-2"
                        />
                        <span className="text-sm">{specialization}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="portfolio_url" className="block text-sm font-medium text-gray-700 mb-1">
                    Portfolio Website URL
                  </label>
                  <input
                    type="url"
                    id="portfolio_url"
                    name="portfolio_url"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.portfolio_url}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label htmlFor="linkedin_url" className="block text-sm font-medium text-gray-700 mb-1">
                    LinkedIn Profile URL
                  </label>
                  <input
                    type="url"
                    id="linkedin_url"
                    name="linkedin_url"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.linkedin_url}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label htmlFor="motivation" className="block text-sm font-medium text-gray-700 mb-1">
                    Why do you want to become an agent? *
                  </label>
                  <textarea
                    id="motivation"
                    name="motivation"
                    required
                    minLength={50}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.motivation}
                    onChange={handleInputChange}
                    placeholder="Please explain your motivation for becoming a real estate agent (minimum 50 characters)..."
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {formData.motivation.length}/50 characters minimum
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Professional References
                    </label>
                    <button
                      type="button"
                      onClick={addReference}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Add Reference
                    </button>
                  </div>
                  
                  {formData.references.map((ref, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3 mb-2">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Reference {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeReference(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="Name"
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                          value={ref.name}
                          onChange={(e) => updateReference(index, 'name', e.target.value)}
                        />
                        <input
                          type="email"
                          placeholder="Email"
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                          value={ref.email}
                          onChange={(e) => updateReference(index, 'email', e.target.value)}
                        />
                        <input
                          type="tel"
                          placeholder="Phone"
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                          value={ref.phone}
                          onChange={(e) => updateReference(index, 'phone', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default AgentApplicationForm;