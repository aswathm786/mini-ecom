/**
 * Admin Webhooks Hook
 * 
 * Manages webhook events: list, view, retry.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAdminApi } from './useAdminApi';

export interface WebhookEvent {
  _id: string;
  event_type: string;
  source: string;
  payload: any;
  status: 'pending' | 'processed' | 'failed';
  attempts: number;
  last_error?: string;
  createdAt: string;
  processedAt?: string;
}

interface UseWebhooksParams {
  page?: number;
  limit?: number;
  status?: string;
  eventType?: string;
  source?: string;
}

interface UseWebhooksResult {
  events: WebhookEvent[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
  setPage: (page: number) => void;
  setFilters: (filters: Partial<UseWebhooksParams>) => void;
  getEvent: (eventId: string) => Promise<WebhookEvent | null>;
  retryEvent: (eventId: string) => Promise<boolean>;
  refetch: () => void;
}

export function useWebhooks(params: UseWebhooksParams = {}): UseWebhooksResult {
  const api = useAdminApi();
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(params.page || 1);
  const [pages, setPages] = useState(0);
  const [filters, setFilters] = useState<Partial<UseWebhooksParams>>(params);
  
  // Use ref to track if we're currently fetching to prevent concurrent requests
  const isFetchingRef = useRef(false);

  const fetchEvents = useCallback(async () => {
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
      if (filters.eventType) queryParams.event_type = filters.eventType;
      if (filters.source) queryParams.source = filters.source;

      const data = await api.get<{ items?: WebhookEvent[]; total?: number; pages?: number }>('/webhooks', queryParams);
      setEvents(data.items ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 0);
    } catch (err) {
      // Only set error if it's not a network error that would cause infinite retries
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch webhook events';
      if (!errorMessage.includes('ERR_INSUFFICIENT_RESOURCES') && !errorMessage.includes('Failed to fetch')) {
        setError(errorMessage);
      } else {
        console.error('Network error fetching webhook events:', err);
        setError('Network error. Please refresh the page.');
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [api, page, filters.status, filters.eventType, filters.source, params.limit]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const getEvent = useCallback(async (eventId: string): Promise<WebhookEvent | null> => {
    try {
      const event = await api.get<WebhookEvent>(`/webhooks/${eventId}`);
      return event;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch webhook event');
      return null;
    }
  }, [api]);

  const retryEvent = useCallback(async (eventId: string): Promise<boolean> => {
    try {
      await api.post(`/webhooks/${eventId}/retry`);
      await fetchEvents();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry webhook event');
      return false;
    }
  }, [api, fetchEvents]);

  return {
    events,
    loading,
    error,
    total,
    page,
    pages,
    setPage,
    setFilters,
    getEvent,
    retryEvent,
    refetch: fetchEvents,
  };
}

