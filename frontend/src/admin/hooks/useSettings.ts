/**
 * Admin Settings Hook
 * 
 * Manages application settings: fetch, update.
 */

import { useState, useCallback, useEffect } from 'react';
import { useAdminApi } from './useAdminApi';

export interface Settings {
  // Payment settings
  'payments.razorpay.enabled': boolean;
  'payments.razorpay.key_id'?: string;
  'payments.razorpay.key_secret'?: string;
  'payments.cod.enabled': boolean;
  
  // Shipping settings
  'shipping.delhivery.enabled': boolean;
  'shipping.delhivery.token'?: string;
  'shipping.delhivery.client_id'?: string;
  
  // SMTP settings
  'smtp.host'?: string;
  'smtp.port'?: number;
  'smtp.user'?: string;
  'smtp.pass'?: string;
  'smtp.from'?: string;
  
  // Store settings
  'store.name'?: string;
  'store.email'?: string;
  'store.phone'?: string;
  'store.address'?: string;
  
  // Invoice settings
  'invoice.prefix'?: string;
  'invoice.number_format'?: string;
  
  // Refund settings
  'refunds.window_days'?: number;
  'refunds.auto_process'?: boolean;
  
  // Other settings
  [key: string]: any;
}

interface UseSettingsResult {
  settings: Settings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (updates: Partial<Settings>) => Promise<boolean>;
  refetch: () => void;
}

export function useSettings(): UseSettingsResult {
  const api = useAdminApi();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.get<Settings>('/settings');
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (updates: Partial<Settings>): Promise<boolean> => {
    try {
      const updated = await api.put<Settings>('/settings', updates);
      setSettings((prev) => ({ ...prev, ...updated }));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
      return false;
    }
  }, [api]);

  return {
    settings,
    loading,
    error,
    updateSettings,
    refetch: fetchSettings,
  };
}

