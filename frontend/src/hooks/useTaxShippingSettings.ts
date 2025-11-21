/**
 * useTaxShippingSettings Hook
 * 
 * Fetches tax and shipping settings from the server (public endpoint).
 */

import { useState, useEffect, useCallback } from 'react';
import { csrfFetch } from '../lib/csrfFetch';

export interface TaxShippingSettings {
  taxRate: number;
  defaultShippingCost: number;
  shippingCalculationMethod: 'flat' | 'dynamic';
}

interface UseTaxShippingSettingsResult {
  settings: TaxShippingSettings | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTaxShippingSettings(): UseTaxShippingSettingsResult {
  const [settings, setSettings] = useState<TaxShippingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await csrfFetch('/api/settings/tax-shipping');
      
      if (response.ok && response.data) {
        setSettings(response.data);
      } else {
        // Default to 18% tax if API fails
        setSettings({
          taxRate: 18,
          defaultShippingCost: 0,
          shippingCalculationMethod: 'dynamic',
        });
      }
    } catch (err) {
      console.error('Error fetching tax/shipping settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tax/shipping settings');
      // Default to 18% tax on error
      setSettings({
        taxRate: 18,
        defaultShippingCost: 0,
        shippingCalculationMethod: 'dynamic',
      });
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

