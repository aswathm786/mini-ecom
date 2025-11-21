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
  
  // Site settings
  'site.name'?: string;
  
  // Invoice settings
  'invoice.prefix'?: string;
  'invoice.number_format'?: string;
  
  // Refund settings
  'refunds.window_days'?: number;
  'refunds.auto_process'?: boolean;
  
  // Auth settings
  'auth.session.expires_in'?: string;
  
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
      // Use platform settings endpoint which returns a flattened settings object
      const data = await api.get<Settings>('/settings/platform');
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
      // Persist each updated path via /settings/path endpoint
      // Only send entries that are explicitly set (not undefined)
      const entries = Object.entries(updates).filter(([_, value]) => value !== undefined);
      for (const [path, value] of entries) {
        // Send the value as-is, including false, 0, empty string, null
        await api.patch('/settings/path', { path, value });
      }
      // Refetch settings from server to ensure we have the latest data
      await fetchSettings();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
      return false;
    }
  }, [api, fetchSettings]);

  return {
    settings,
    loading,
    error,
    updateSettings,
    refetch: fetchSettings,
  };
}

