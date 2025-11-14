/**
 * Admin Orders Hook
 * 
 * Manages admin order operations: list, view, update status, manual capture, refund, create shipment.
 */

import { useState, useCallback } from 'react';
import { useAdminApi } from './useAdminApi';

export interface Order {
  _id: string;
  userId: string;
  items: Array<{
    productId: string;
    name: string;
    qty: number;
    priceAt: number;
  }>;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  payment?: {
    _id: string;
    status: string;
    gateway: string;
    gateway_order_id?: string;
    gateway_payment_id?: string;
  };
  shippingAddress: any;
  billingAddress?: any;
  placedAt: string;
  shipment?: {
    _id: string;
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

interface UseOrdersAdminParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
}

interface UseOrdersAdminResult {
  orders: Order[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
  setPage: (page: number) => void;
  setFilters: (filters: Partial<UseOrdersAdminParams>) => void;
  refetch: () => void;
  updateStatus: (orderId: string, status: string) => Promise<boolean>;
  manualCapture: (orderId: string) => Promise<boolean>;
  createRefund: (orderId: string, amount: number, reason: string) => Promise<any>;
  generateInvoice: (orderId: string) => Promise<any>;
  sendInvoice: (orderId: string) => Promise<boolean>;
}

export function useOrdersAdmin(params: UseOrdersAdminParams = {}): UseOrdersAdminResult {
  const api = useAdminApi();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(params.page || 1);
  const [pages, setPages] = useState(0);
  const [filters, setFilters] = useState<Partial<UseOrdersAdminParams>>(params);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams: Record<string, any> = {
        page: page.toString(),
        limit: (params.limit || 20).toString(),
      };
      if (filters.status) queryParams.status = filters.status;
      if (filters.search) queryParams.search = filters.search;
      if (filters.fromDate) queryParams.fromDate = filters.fromDate;
      if (filters.toDate) queryParams.toDate = filters.toDate;

      const data = await api.get<{ items: Order[]; total: number; pages: number }>('/orders', queryParams);
      setOrders(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [api, page, filters, params.limit]);

  const updateStatus = useCallback(async (orderId: string, status: string): Promise<boolean> => {
    try {
      await api.put(`/orders/${orderId}`, { status });
      await fetchOrders();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order status');
      return false;
    }
  }, [api, fetchOrders]);

  const manualCapture = useCallback(async (orderId: string): Promise<boolean> => {
    try {
      await api.post(`/orders/${orderId}/manual-capture`);
      await fetchOrders();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to capture payment');
      return false;
    }
  }, [api, fetchOrders]);

  const createRefund = useCallback(async (orderId: string, amount: number, reason: string): Promise<any> => {
    try {
      const refund = await api.post(`/orders/${orderId}/refund`, { amount, reason });
      await fetchOrders();
      return refund;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create refund');
      throw err;
    }
  }, [api, fetchOrders]);

  const generateInvoice = useCallback(async (orderId: string): Promise<any> => {
    try {
      const invoice = await api.post(`/orders/${orderId}/generate-invoice`);
      return invoice;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate invoice');
      throw err;
    }
  }, [api]);

  const sendInvoice = useCallback(async (orderId: string): Promise<boolean> => {
    try {
      await api.post(`/orders/${orderId}/send-invoice`);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invoice');
      return false;
    }
  }, [api]);

  return {
    orders,
    loading,
    error,
    total,
    page,
    pages,
    setPage,
    setFilters,
    refetch: fetchOrders,
    updateStatus,
    manualCapture,
    createRefund,
    generateInvoice,
    sendInvoice,
  };
}

