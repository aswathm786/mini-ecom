/**
 * Store Settings Hook
 * 
 * Manages store branding settings (name, logo, favicon, contact info).
 */

import { useState, useCallback, useEffect } from 'react';

export interface StoreSettings {
  name?: string;
  logo?: string;
  favicon?: string;
  tagline?: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface UseStoreSettingsResult {
  settings: StoreSettings | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useStoreSettings(): UseStoreSettingsResult {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/store-settings');
      if (!response.ok) {
        throw new Error('Failed to fetch store settings');
      }
      const data = await response.json();
      if (data.ok && data.data) {
        setSettings(data.data);
      } else {
        setSettings({});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch store settings');
      setSettings({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    error,
    refetch: fetchSettings,
  };
}

