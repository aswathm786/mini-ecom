/**
 * Tax and Shipping Settings Hook
 * 
 * Manages tax rate and shipping cost settings.
 */

import { useState, useCallback, useEffect } from 'react';
import { useAdminApi } from './useAdminApi';

export interface TaxShippingSettings {
  taxRate: number;
  defaultShippingCost: number;
  shippingCalculationMethod: 'flat' | 'dynamic';
}

interface UseTaxShippingSettingsResult {
  settings: TaxShippingSettings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (updates: Partial<TaxShippingSettings>) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useTaxShippingSettings(): UseTaxShippingSettingsResult {
  const api = useAdminApi();
  const [settings, setSettings] = useState<TaxShippingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // useAdminApi returns the data directly (not wrapped in { ok, data })
      const data = await api.get<TaxShippingSettings>('/settings/tax-shipping');
      
      if (data) {
        setSettings(data);
      } else {
        // Use defaults if API fails
        setSettings({
          taxRate: 18,
          defaultShippingCost: 0,
          shippingCalculationMethod: 'dynamic',
        });
      }
    } catch (err) {
      console.error('Error fetching tax/shipping settings:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tax/shipping settings';
      setError(errorMessage);
      // Use defaults on error
      setSettings({
        taxRate: 18,
        defaultShippingCost: 0,
        shippingCalculationMethod: 'dynamic',
      });
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (updates: Partial<TaxShippingSettings>): Promise<boolean> => {
    try {
      // useAdminApi returns the data directly (not wrapped in { ok, data })
      const data = await api.patch<TaxShippingSettings>('/settings/tax-shipping', updates);
      if (data) {
        setSettings(data);
        return true;
      }
      setError('Failed to update settings');
      return false;
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

