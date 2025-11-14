/**
 * useOrders Hook
 * 
 * Fetches and manages user orders with pagination and filters.
 */

import { useState, useEffect, useCallback } from 'react';
import { csrfFetch } from '../lib/csrfFetch';

export interface OrderItem {
  productId: string;
  name: string;
  qty: number;
  priceAt: number;
}

export interface Order {
  _id: string;
  userId: string;
  items: OrderItem[];
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  payment?: {
    status: string;
    gateway: string;
  };
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  billingAddress?: {
    name: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  placedAt: string;
  shipment?: {
    awb?: string;
    status?: string;
  };
  refunds?: Array<{
    _id: string;
    amount: number;
    status: string;
    reason: string;
  }>;
}

interface UseOrdersParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

interface UseOrdersResult {
  orders: Order[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
  setPage: (page: number) => void;
  setStatus: (status: string | undefined) => void;
  setSearch: (search: string | undefined) => void;
  refetch: () => void;
}

export function useOrders(params: UseOrdersParams = {}): UseOrdersResult {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(params.page || 1);
  const [pages, setPages] = useState(0);
  const [status, setStatus] = useState<string | undefined>(params.status);
  const [search, setSearch] = useState<string | undefined>(params.search);

  const limit = params.limit || 20;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      queryParams.set('page', page.toString());
      queryParams.set('limit', limit.toString());
      if (status) queryParams.set('status', status);
      if (search) queryParams.set('search', search);

      const response = await csrfFetch(`/api/orders?${queryParams.toString()}`);

      if (response.ok && response.data) {
        if (Array.isArray(response.data)) {
          setOrders(response.data);
        } else if (response.data.items) {
          setOrders(response.data.items);
          setTotal(response.data.total || 0);
          setPages(response.data.pages || 0);
        } else {
          setOrders([]);
        }
      } else {
        setError(response.error || 'Failed to fetch orders');
        setOrders([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, status, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    loading,
    error,
    total,
    page,
    pages,
    setPage,
    setStatus,
    setSearch,
    refetch: fetchOrders,
  };
}

