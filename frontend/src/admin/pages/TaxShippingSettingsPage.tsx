/**
 * Tax and Shipping Settings Page
 * 
 * Admin page for configuring GST rate and shipping costs.
 */

import { useState, useEffect } from 'react';
import { useTaxShippingSettings } from '../hooks/useTaxShippingSettings';
import { Button } from '../../components/Button';
import { ToastContainer } from '../../components/Toast';
import { FiSave } from 'react-icons/fi';

export function TaxShippingSettingsPage() {
  const { settings, loading, error, updateSettings, refetch } = useTaxShippingSettings();
  const [localSettings, setLocalSettings] = useState({
    taxRate: 18,
    defaultShippingCost: 0,
    shippingCalculationMethod: 'dynamic' as 'flat' | 'dynamic',
  });
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }>>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const toastId = Date.now().toString();
    setToasts((prev) => [...prev, { id: toastId, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleSave = async () => {
    // Validation
    if (localSettings.taxRate < 0 || localSettings.taxRate > 100) {
      addToast('Tax rate must be between 0 and 100', 'error');
      return;
    }

    if (localSettings.defaultShippingCost < 0) {
      addToast('Default shipping cost cannot be negative', 'error');
      return;
    }

    setSaving(true);
    try {
      const success = await updateSettings(localSettings);
      if (success) {
        addToast('Settings saved successfully', 'success');
        await refetch();
      } else {
        addToast('Failed to save settings', 'error');
      }
    } catch (err) {
      addToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="space-y-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tax & Shipping Settings</h1>
        <p className="text-sm text-gray-600 mt-1">
          Configure GST rate and shipping costs for checkout calculations
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        {/* Tax Rate */}
        <div>
          <label htmlFor="taxRate" className="block text-sm font-medium text-gray-700 mb-2">
            GST/Tax Rate (%)
          </label>
          <div className="flex items-center gap-2">
            <input
              id="taxRate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={localSettings.taxRate}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  taxRate: parseFloat(e.target.value) || 0,
                })
              }
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-600">%</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Tax rate applied to order subtotal (e.g., 18 for 18% GST)
          </p>
        </div>

        {/* Shipping Calculation Method */}
        <div>
          <label htmlFor="shippingMethod" className="block text-sm font-medium text-gray-700 mb-2">
            Shipping Calculation Method
          </label>
          <select
            id="shippingMethod"
            value={localSettings.shippingCalculationMethod}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                shippingCalculationMethod: e.target.value as 'flat' | 'dynamic',
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="dynamic">Dynamic (Use shipping provider rates)</option>
            <option value="flat">Flat Rate (Use default shipping cost)</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Choose how shipping costs are calculated. Dynamic uses shipping provider APIs, flat uses the default cost below.
          </p>
        </div>

        {/* Default Shipping Cost */}
        <div>
          <label htmlFor="defaultShippingCost" className="block text-sm font-medium text-gray-700 mb-2">
            Default Shipping Cost (₹)
          </label>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">₹</span>
            <input
              id="defaultShippingCost"
              type="number"
              min="0"
              step="0.01"
              value={localSettings.defaultShippingCost}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  defaultShippingCost: parseFloat(e.target.value) || 0,
                })
              }
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Default shipping cost used when calculation method is set to "Flat Rate" or when shipping provider is unavailable
          </p>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving}
            isLoading={saving}
          >
            <FiSave className="mr-2" />
            Save Settings
          </Button>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

