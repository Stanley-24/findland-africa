/**
 * Shared API utility functions
 */

import axios from 'axios';

export const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

export const createAuthHeaders = (): { Authorization: string } | {} => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const handleApiError = (error: any, defaultMessage: string = 'An error occurred'): string => {
  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return defaultMessage;
};

export const isUnauthorized = (error: any): boolean => {
  return error.response?.status === 401;
};

export const isForbidden = (error: any): boolean => {
  return error.response?.status === 403;
};

export const isNotFound = (error: any): boolean => {
  return error.response?.status === 404;
};

export const createApiClient = (baseURL: string) => {
  const client = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add auth token to requests
  client.interceptors.request.use((config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return client;
};
