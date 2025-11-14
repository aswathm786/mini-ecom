/**
 * Admin Settings Page
 * 
 * Editable settings form (Razorpay, Delhivery, SMTP, toggles).
 */

import { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { Button } from '../../components/Button';
import { ToastContainer } from '../../components/Toast';

export function SettingsPage() {
  const { settings, loading, error, updateSettings } = useSettings();
  const [localSettings, setLocalSettings] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }>>([]);
  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set());

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const toastId = Date.now().toString();
    setToasts((prev) => [...prev, { id: toastId, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const success = await updateSettings(localSettings);
      if (success) {
        addToast('Settings saved successfully', 'success');
      } else {
        addToast('Failed to save settings', 'error');
      }
    } catch (err) {
      addToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleSecret = (key: string) => {
    // TODO: Implement re-auth flow before revealing secrets
    setRevealedSecrets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const maskSecret = (value: string | undefined) => {
    if (!value) return '';
    return '•'.repeat(20);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Payment Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="razorpay-enabled" className="text-sm font-medium text-gray-700">
                Enable Razorpay
              </label>
              <input
                id="razorpay-enabled"
                type="checkbox"
                checked={localSettings['payments.razorpay.enabled'] || false}
                onChange={(e) => setLocalSettings({ ...localSettings, 'payments.razorpay.enabled': e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
            </div>
            <div>
              <label htmlFor="razorpay-key-id" className="block text-sm font-medium text-gray-700 mb-1">
                Razorpay Key ID
              </label>
              <input
                id="razorpay-key-id"
                type="text"
                value={localSettings['payments.razorpay.key_id'] || ''}
                onChange={(e) => setLocalSettings({ ...localSettings, 'payments.razorpay.key_id': e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label htmlFor="razorpay-key-secret" className="block text-sm font-medium text-gray-700 mb-1">
                Razorpay Key Secret
              </label>
              <div className="flex gap-2">
                <input
                  id="razorpay-key-secret"
                  type={revealedSecrets.has('razorpay-secret') ? 'text' : 'password'}
                  value={revealedSecrets.has('razorpay-secret') ? (localSettings['payments.razorpay.key_secret'] || '') : maskSecret(localSettings['payments.razorpay.key_secret'])}
                  onChange={(e) => setLocalSettings({ ...localSettings, 'payments.razorpay.key_secret': e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => toggleSecret('razorpay-secret')}
                >
                  {revealedSecrets.has('razorpay-secret') ? 'Hide' : 'Reveal'}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label htmlFor="cod-enabled" className="text-sm font-medium text-gray-700">
                Enable COD
              </label>
              <input
                id="cod-enabled"
                type="checkbox"
                checked={localSettings['payments.cod.enabled'] || false}
                onChange={(e) => setLocalSettings({ ...localSettings, 'payments.cod.enabled': e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
            </div>
          </div>
        </div>

        {/* Shipping Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="delhivery-enabled" className="text-sm font-medium text-gray-700">
                Enable Delhivery
              </label>
              <input
                id="delhivery-enabled"
                type="checkbox"
                checked={localSettings['shipping.delhivery.enabled'] || false}
                onChange={(e) => setLocalSettings({ ...localSettings, 'shipping.delhivery.enabled': e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
            </div>
            <div>
              <label htmlFor="delhivery-token" className="block text-sm font-medium text-gray-700 mb-1">
                Delhivery Token
              </label>
              <div className="flex gap-2">
                <input
                  id="delhivery-token"
                  type={revealedSecrets.has('delhivery-token') ? 'text' : 'password'}
                  value={revealedSecrets.has('delhivery-token') ? (localSettings['shipping.delhivery.token'] || '') : maskSecret(localSettings['shipping.delhivery.token'])}
                  onChange={(e) => setLocalSettings({ ...localSettings, 'shipping.delhivery.token': e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => toggleSecret('delhivery-token')}
                >
                  {revealedSecrets.has('delhivery-token') ? 'Hide' : 'Reveal'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Store Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Store Settings</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="store-name" className="block text-sm font-medium text-gray-700 mb-1">
                Store Name
              </label>
              <input
                id="store-name"
                type="text"
                value={localSettings['store.name'] || ''}
                onChange={(e) => setLocalSettings({ ...localSettings, 'store.name': e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label htmlFor="invoice-prefix" className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Prefix
              </label>
              <input
                id="invoice-prefix"
                type="text"
                value={localSettings['invoice.prefix'] || ''}
                onChange={(e) => setLocalSettings({ ...localSettings, 'invoice.prefix': e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" isLoading={saving}>
            Save Settings
          </Button>
        </div>
      </form>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

