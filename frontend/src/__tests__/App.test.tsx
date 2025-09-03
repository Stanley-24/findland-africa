import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';

// Mock fetch for testing
global.fetch = jest.fn();

describe('App Component', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  test('renders FindLand Africa title', () => {
    render(<App />);
    const titleElement = screen.getByText(/FindLand Africa/i);
    expect(titleElement).toBeInTheDocument();
  });

  test('renders MVP subtitle', () => {
    render(<App />);
    const subtitleElement = screen.getByText(/Real Estate Bridging Loan Platform - MVP/i);
    expect(subtitleElement).toBeInTheDocument();
  });

  test('shows loading state initially', () => {
    render(<App />);
    const loadingElement = screen.getByText(/Connecting to API/i);
    expect(loadingElement).toBeInTheDocument();
  });

  test('displays API status when successful', async () => {
    const mockApiResponse = {
      message: "FindLand Africa API is running! 🏗️",
      status: "healthy",
      timestamp: "2025-09-03T17:23:00.542723",
      version: "1.0.0",
      environment: "development"
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    });

    render(<App />);
    
    // Wait for API call to complete
    await screen.findByText(/FindLand Africa API is running/i);
    
    expect(screen.getByText(/healthy/i)).toBeInTheDocument();
    expect(screen.getByText(/1.0.0/i)).toBeInTheDocument();
  });

  test('displays error when API call fails', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<App />);
    
    // Wait for error to appear
    await screen.findByText(/Connection Error/i);
    
    expect(screen.getByText(/Network error/i)).toBeInTheDocument();
  });

  test('renders MVP features section', () => {
    render(<App />);
    const featuresTitle = screen.getByText(/MVP Features/i);
    expect(featuresTitle).toBeInTheDocument();
    
    const helloWorldFeature = screen.getByText(/Hello World API/i);
    expect(helloWorldFeature).toBeInTheDocument();
  });

  test('renders project status section', () => {
    render(<App />);
    const statusTitle = screen.getByText(/Project Status/i);
    expect(statusTitle).toBeInTheDocument();
    
    const budgetElement = screen.getByText(/\$200-500\/month/i);
    expect(budgetElement).toBeInTheDocument();
  });
});
