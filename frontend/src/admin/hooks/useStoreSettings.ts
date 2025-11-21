/**
 * Admin Store Settings Hook
 * 
 * Manages store branding settings for admin panel (with update capability).
 */

import { useState, useCallback, useEffect } from 'react';
import { useAdminApi } from './useAdminApi';

export interface StoreSettings {
  name?: string;
  logo?: string;
  favicon?: string;
  tagline?: string;
  link?: string;
  email?: string;
  phone?: string;
  address?: string;
  backendStoreName?: string;
  invoicePrefix?: string;
}

interface UseStoreSettingsResult {
  settings: StoreSettings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (updates: Partial<StoreSettings>) => Promise<boolean>;
  uploadLogo: (file: File) => Promise<string | null>;
  uploadFavicon: (file: File) => Promise<string | null>;
  refetch: () => void;
}

export function useStoreSettings(): UseStoreSettingsResult {
  const api = useAdminApi();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );
      
      // useAdminApi returns the data directly (not wrapped in { ok, data })
      const data = await Promise.race([
        api.get<StoreSettings>('/store-settings'),
        timeoutPromise
      ]) as StoreSettings;
      
      setSettings(data || {});
    } catch (err) {
      console.error('Error fetching store settings:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch store settings';
      setError(errorMessage);
      // Set empty settings on error so the form can still render
      setSettings({});
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (updates: Partial<StoreSettings>): Promise<boolean> => {
    try {
      const updated = await api.put<StoreSettings>('/store-settings', updates);
      setSettings(updated);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update store settings');
      return false;
    }
  }, [api]);

  const uploadLogo = useCallback(async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('logo', file);
      
      const response = await api.postForm<{ logo: string }>('/store-settings/upload-logo', formData);
      if (response.logo) {
        setSettings((prev) => ({ ...prev, logo: response.logo }));
        return response.logo;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload logo');
      return null;
    }
  }, [api]);

  const uploadFavicon = useCallback(async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('favicon', file);
      
      const response = await api.postForm<{ favicon: string }>('/store-settings/upload-favicon', formData);
      if (response.favicon) {
        setSettings((prev) => ({ ...prev, favicon: response.favicon }));
        return response.favicon;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload favicon');
      return null;
    }
  }, [api]);

  return {
    settings,
    loading,
    error,
    updateSettings,
    uploadLogo,
    uploadFavicon,
    refetch: fetchSettings,
  };
}

