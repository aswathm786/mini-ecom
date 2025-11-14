/**
 * Admin Reports Hook
 * 
 * Manages reports: sales, top products, refunds summary.
 */

import { useState, useCallback } from 'react';
import { useAdminApi } from './useAdminApi';

export interface SalesReport {
  date: string;
  orders: number;
  revenue: number;
  refunds: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  sales: number;
  revenue: number;
}

export interface RefundsSummary {
  total: number;
  amount: number;
  byStatus: Record<string, number>;
}

interface UseReportsParams {
  fromDate?: string;
  toDate?: string;
}

interface UseReportsResult {
  loading: boolean;
  error: string | null;
  salesReport: SalesReport[] | null;
  topProducts: TopProduct[] | null;
  refundsSummary: RefundsSummary | null;
  fetchSalesReport: (params: UseReportsParams) => Promise<void>;
  fetchTopProducts: (limit?: number) => Promise<void>;
  fetchRefundsSummary: (params: UseReportsParams) => Promise<void>;
  exportCSV: (type: 'sales' | 'products' | 'refunds', params?: UseReportsParams) => Promise<void>;
}

export function useReports(): UseReportsResult {
  const api = useAdminApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [salesReport, setSalesReport] = useState<SalesReport[] | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[] | null>(null);
  const [refundsSummary, setRefundsSummary] = useState<RefundsSummary | null>(null);

  const fetchSalesReport = useCallback(async (params: UseReportsParams) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams: Record<string, any> = {};
      if (params.fromDate) queryParams.from = params.fromDate;
      if (params.toDate) queryParams.to = params.toDate;

      const data = await api.get<SalesReport[]>('/reports/sales', queryParams);
      setSalesReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sales report');
    } finally {
      setLoading(false);
    }
  }, [api]);

  const fetchTopProducts = useCallback(async (limit: number = 10) => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.get<TopProduct[]>('/reports/top-products', { limit: limit.toString() });
      setTopProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch top products');
    } finally {
      setLoading(false);
    }
  }, [api]);

  const fetchRefundsSummary = useCallback(async (params: UseReportsParams) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams: Record<string, any> = {};
      if (params.fromDate) queryParams.from = params.fromDate;
      if (params.toDate) queryParams.to = params.toDate;

      const data = await api.get<RefundsSummary>('/reports/refunds', queryParams);
      setRefundsSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch refunds summary');
    } finally {
      setLoading(false);
    }
  }, [api]);

  const exportCSV = useCallback(async (type: 'sales' | 'products' | 'refunds', params?: UseReportsParams) => {
    try {
      const queryParams: Record<string, any> = {};
      if (params?.fromDate) queryParams.from = params.fromDate;
      if (params?.toDate) queryParams.to = params.toDate;

      const response = await fetch(`/api/admin/reports/${type}.csv?${new URLSearchParams(queryParams).toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to export CSV');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export CSV');
      throw err;
    }
  }, []);

  return {
    loading,
    error,
    salesReport,
    topProducts,
    refundsSummary,
    fetchSalesReport,
    fetchTopProducts,
    fetchRefundsSummary,
    exportCSV,
  };
}

