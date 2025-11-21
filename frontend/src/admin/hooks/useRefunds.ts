/**
 * Admin Refunds Hook
 * 
 * Manages refund operations: list, process refunds.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAdminApi } from './useAdminApi';

export interface Refund {
  _id: string;
  orderId: string;
  amount: number;
  currency: string;
  reason: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  gateway_refund_id?: string;
  createdAt: string;
  updatedAt: string;
}

interface UseRefundsParams {
  page?: number;
  limit?: number;
  status?: string;
  orderId?: string;
}

interface UseRefundsResult {
  refunds: Refund[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
  setPage: (page: number) => void;
  setFilters: (filters: Partial<UseRefundsParams>) => void;
  processRefund: (refundId: string) => Promise<boolean>;
  refetch: () => void;
}

export function useRefunds(params: UseRefundsParams = {}): UseRefundsResult {
  const api = useAdminApi();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(params.page || 1);
  const [pages, setPages] = useState(0);
  const [filters, setFilters] = useState<Partial<UseRefundsParams>>(params);
  
  // Use ref to track if we're currently fetching to prevent concurrent requests
  const isFetchingRef = useRef(false);

  const fetchRefunds = useCallback(async () => {
    // Prevent concurrent requests
    if (isFetchingRef.current) {
      return;
    }
    
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const queryParams: Record<string, any> = {
        page: page.toString(),
        limit: (params.limit || 20).toString(),
      };
      if (filters.status) queryParams.status = filters.status;
      if (filters.orderId) queryParams.orderId = filters.orderId;

      const data = await api.get<{ items: Refund[]; total: number; pages: number }>('/refunds', queryParams);
      setRefunds(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      // Only set error if it's not a network error that would cause infinite retries
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch refunds';
      if (!errorMessage.includes('ERR_INSUFFICIENT_RESOURCES') && !errorMessage.includes('Failed to fetch')) {
        setError(errorMessage);
      } else {
        console.error('Network error fetching refunds:', err);
        setError('Network error. Please refresh the page.');
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [api, page, filters.status, filters.orderId, params.limit]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  const processRefund = useCallback(async (refundId: string): Promise<boolean> => {
    try {
      await api.post(`/refunds/${refundId}/process`);
      await fetchRefunds();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process refund');
      return false;
    }
  }, [api, fetchRefunds]);

  return {
    refunds,
    loading,
    error,
    total,
    page,
    pages,
    setPage,
    setFilters,
    processRefund,
    refetch: fetchRefunds,
  };
}

