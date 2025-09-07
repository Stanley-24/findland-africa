/**
 * Shared custom hooks for API operations
 */

import { useState, useCallback } from 'react';
import { getAuthToken, handleApiError } from '../utils/apiUtils';

export interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: any[]) => Promise<T | null>;
  reset: () => void;
}

export const useApi = <T = any>(apiFunction: (...args: any[]) => Promise<T>): UseApiReturn<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (...args: any[]): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiFunction(...args);
      setData(result);
      return result;
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiFunction]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
};

export const useLoading = (initialState: boolean = false) => {
  const [loading, setLoading] = useState(initialState);
  
  const startLoading = useCallback(() => setLoading(true), []);
  const stopLoading = useCallback(() => setLoading(false), []);
  
  return { loading, startLoading, stopLoading };
};

export const useError = () => {
  const [error, setError] = useState<string | null>(null);
  
  const setErrorState = useCallback((errorMessage: string | null) => {
    setError(errorMessage);
  }, []);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  return { error, setError: setErrorState, clearError };
};
