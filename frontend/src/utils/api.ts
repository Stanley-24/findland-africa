/**
 * Centralized API service utilities to eliminate duplicate fetch patterns
 */

import { getAuthHeaders } from './auth';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Generic API request function with authentication
 */
export const apiRequest = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...getAuthHeaders(),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(response.status, errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { data, success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message, success: false };
    }
    return { error: 'Network error. Please try again.', success: false };
  }
};

/**
 * GET request helper
 */
export const apiGet = <T = any>(endpoint: string): Promise<ApiResponse<T>> => {
  return apiRequest<T>(endpoint, { method: 'GET' });
};

/**
 * POST request helper
 */
export const apiPost = <T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> => {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
};

/**
 * PUT request helper
 */
export const apiPut = <T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> => {
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
};

/**
 * DELETE request helper
 */
export const apiDelete = <T = any>(endpoint: string): Promise<ApiResponse<T>> => {
  return apiRequest<T>(endpoint, { method: 'DELETE' });
};

/**
 * Form data POST request helper (for file uploads)
 */
export const apiPostFormData = async <T = any>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> => {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = getAuthHeaders();

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(response.status, errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { data, success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message, success: false };
    }
    return { error: 'Network error. Please try again.', success: false };
  }
};

/**
 * Login request helper
 */
export const apiLogin = async (email: string, password: string): Promise<ApiResponse<{ access_token: string }>> => {
  try {
    const url = `${API_BASE_URL}/api/v1/auth/login`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: email,
        password: password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ApiError(response.status, errorData.detail || 'Login failed');
    }

    const data = await response.json();
    return { data, success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message, success: false };
    }
    return { error: 'Network error. Please try again.', success: false };
  }
};

/**
 * Get current user profile
 */
export const getCurrentUserProfile = (): Promise<ApiResponse<any>> => {
  // Add cache-busting parameter to ensure fresh data
  const cacheBuster = Date.now();
  return apiGet(`/api/v1/auth/me?_t=${cacheBuster}`);
};
