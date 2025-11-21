/**
 * usePaymentMethods Hook
 * 
 * Fetches enabled payment methods from the server.
 */

import { useState, useEffect, useCallback } from 'react';
import { csrfFetch } from '../lib/csrfFetch';

export interface PaymentMethod {
  method: string;
  enabled: boolean;
}

interface UsePaymentMethodsResult {
  methods: PaymentMethod[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePaymentMethods(): UsePaymentMethodsResult {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMethods = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await csrfFetch('/api/settings/payments');
      
      if (response.ok && response.data) {
        setMethods(response.data);
      } else {
        // Default to both methods if API fails
        setMethods([
          { method: 'razorpay', enabled: true },
          { method: 'cod', enabled: true },
        ]);
      }
    } catch (err) {
      console.error('Error fetching payment methods:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch payment methods');
      // Default to both methods on error
      setMethods([
        { method: 'razorpay', enabled: true },
        { method: 'cod', enabled: true },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMethods();
  }, [fetchMethods]);

  return {
    methods,
    loading,
    error,
    refetch: fetchMethods,
  };
}

