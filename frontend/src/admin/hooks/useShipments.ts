/**
 * Admin Shipments Hook
 * 
 * Manages shipment operations: list, create, schedule pickup, cancel, download label.
 */

import { useState, useCallback, useEffect } from 'react';
import { useAdminApi } from './useAdminApi';

export interface Shipment {
  _id: string;
  orderId: string;
  awb?: string;
  status: 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  carrier?: string;
  trackingUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateShipmentData {
  orderId: string;
  serviceType?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

interface UseShipmentsParams {
  page?: number;
  limit?: number;
  status?: string;
  orderId?: string;
}

interface UseShipmentsResult {
  shipments: Shipment[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
  setPage: (page: number) => void;
  setFilters: (filters: Partial<UseShipmentsParams>) => void;
  createShipment: (data: CreateShipmentData) => Promise<Shipment>;
  schedulePickup: (shipmentId: string) => Promise<boolean>;
  cancelShipment: (shipmentId: string) => Promise<boolean>;
  downloadLabel: (shipmentId: string) => Promise<void>;
  refetch: () => void;
}

export function useShipments(params: UseShipmentsParams = {}): UseShipmentsResult {
  const api = useAdminApi();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(params.page || 1);
  const [pages, setPages] = useState(0);
  const [filters, setFilters] = useState<Partial<UseShipmentsParams>>(params);

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams: Record<string, any> = {
        page: page.toString(),
        limit: (params.limit || 20).toString(),
      };
      if (filters.status) queryParams.status = filters.status;
      if (filters.orderId) queryParams.orderId = filters.orderId;

      const data = await api.get<{ items: Shipment[]; total: number; pages: number }>('/shipments', queryParams);
      setShipments(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch shipments');
    } finally {
      setLoading(false);
    }
  }, [api, page, filters, params.limit]);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  const createShipment = useCallback(async (data: CreateShipmentData): Promise<Shipment> => {
    try {
      const shipment = await api.post<Shipment>('/shipments', data);
      await fetchShipments();
      return shipment;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shipment');
      throw err;
    }
  }, [api, fetchShipments]);

  const schedulePickup = useCallback(async (shipmentId: string): Promise<boolean> => {
    try {
      await api.post(`/shipments/${shipmentId}/schedule-pickup`);
      await fetchShipments();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule pickup');
      return false;
    }
  }, [api, fetchShipments]);

  const cancelShipment = useCallback(async (shipmentId: string): Promise<boolean> => {
    try {
      await api.post(`/shipments/${shipmentId}/cancel`);
      await fetchShipments();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel shipment');
      return false;
    }
  }, [api, fetchShipments]);

  const downloadLabel = useCallback(async (shipmentId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/admin/shipments/${shipmentId}/label`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to download label');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shipment_${shipmentId}_label.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download label');
      throw err;
    }
  }, []);

  return {
    shipments,
    loading,
    error,
    total,
    page,
    pages,
    setPage,
    setFilters,
    createShipment,
    schedulePickup,
    cancelShipment,
    downloadLabel,
    refetch: fetchShipments,
  };
}

