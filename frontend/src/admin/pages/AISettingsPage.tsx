/**
 * AI Settings Page
 * 
 * Allows admins to enable/disable AI features:
 * - Product Enhancements
 * - Other AI admin tools
 */

import { useState, useEffect } from 'react';
import { useAdminApi } from '../hooks/useAdminApi';
import { Button } from '../../components/Button';
import { ToastContainer } from '../../components/Toast';
import { FiCpu, FiEdit, FiMail, FiMessageCircle, FiBarChart2 } from 'react-icons/fi';
import { useAIContext } from '../../contexts/AIContext';

interface AISettings {
  admin?: {
    productDescription?: { enabled: boolean };
    productFAQ?: { enabled: boolean };
    emailGenerator?: { enabled: boolean };
    supportReply?: { enabled: boolean };
  };
}

interface SearchSettings {
  semantic?: { enabled: boolean };
  autocomplete?: { enabled: boolean };
  trending?: { enabled: boolean };
}

export function AISettingsPage() {
  const api = useAdminApi();
  const { refresh: refreshAIContext } = useAIContext();
  const [aiSettings, setAISettings] = useState<AISettings>({});
  const [searchSettings, setSearchSettings] = useState<SearchSettings>({});
  const [aiEnabled, setAIEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
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
    loadSettings();
    
    // Refresh AI enabled status periodically (every 10 seconds) to catch changes from Settings page
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/ai/admin/settings', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          const newAIEnabled = data?.data?.enabled || false;
          setAIEnabled((prev) => {
            if (prev !== newAIEnabled) {
              return newAIEnabled;
            }
            return prev;
          });
        }
      } catch {
        // Silently fail - don't show error for background refresh
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [aiResponse, searchResponse, aiServiceResponse] = await Promise.all([
        api.get<AISettings>('/settings/advanced/ai'),
        api.get<SearchSettings>('/settings/advanced/ai/search'),
        // Get AI enabled status from AI service settings
        fetch('/api/ai/admin/settings', { credentials: 'include' }).then(res => res.ok ? res.json() : { data: { enabled: false } }).catch(() => ({ data: { enabled: false } })),
      ]);

      setAISettings(aiResponse || {});
      setSearchSettings(searchResponse || {});
      // Get global AI enabled status from AI service
      setAIEnabled(aiServiceResponse?.data?.enabled || false);
    } catch (err) {
      console.error('Error loading AI settings:', err);
      addToast('Failed to load AI settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateAISettings = async (updates: Partial<AISettings>) => {
    setSaving(true);
    try {
      const response = await api.patch<AISettings>('/settings/advanced/ai', updates);
      setAISettings(response || {});
      // Refresh AI context so components see the updated settings immediately
      await refreshAIContext();
      addToast('AI settings updated successfully', 'success');
    } catch (err) {
      console.error('Error updating AI settings:', err);
      addToast('Failed to update AI settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateSearchSettings = async (updates: Partial<SearchSettings>) => {
    setSaving(true);
    try {
      const response = await api.patch<SearchSettings>('/settings/advanced/ai/search', updates);
      setSearchSettings(response || {});
      addToast('Search settings updated successfully', 'success');
    } catch (err) {
      console.error('Error updating search settings:', err);
      addToast('Failed to update search settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleProductDescription = async (enabled: boolean) => {
    if (!aiEnabled && enabled) {
      addToast('Please enable AI in Settings first', 'warning');
      return;
    }
    await updateAISettings({
      admin: {
        ...aiSettings.admin,
        productDescription: { enabled },
      },
    });
  };

  const toggleProductFAQ = async (enabled: boolean) => {
    if (!aiEnabled && enabled) {
      addToast('Please enable AI in Settings first', 'warning');
      return;
    }
    await updateAISettings({
      admin: {
        ...aiSettings.admin,
        productFAQ: { enabled },
      },
    });
  };

  const toggleEmailGenerator = async (enabled: boolean) => {
    if (!aiEnabled && enabled) {
      addToast('Please enable AI in Settings first', 'warning');
      return;
    }
    await updateAISettings({
      admin: {
        ...aiSettings.admin,
        emailGenerator: { enabled },
      },
    });
  };

  const toggleSupportReply = async (enabled: boolean) => {
    if (!aiEnabled && enabled) {
      addToast('Please enable AI in Settings first', 'warning');
      return;
    }
    await updateAISettings({
      admin: {
        ...aiSettings.admin,
        supportReply: { enabled },
      },
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Settings</h1>
          <p className="text-sm text-gray-600 mt-1">
            Configure AI features and capabilities for your store
          </p>
        </div>
      </div>

      {/* Warning if AI is not enabled */}
      {!aiEnabled && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <FiCpu className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-yellow-900">AI Not Enabled</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Please enable AI in <a href="/admin/settings" className="underline font-medium">Settings</a> before enabling individual AI features.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Admin Tools Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">AI Admin Tools</h2>
          <p className="text-sm text-gray-600 mt-1">
            Enable AI-powered tools to help with content creation and management
          </p>
        </div>

        <div className="space-y-6">
          {/* Product Description Generator */}
          <div className="flex items-start justify-between pb-6 border-b border-gray-200 last:border-b-0 last:pb-0">
            <div className="flex items-start space-x-4 flex-1">
              <div className="p-3 bg-green-50 rounded-lg">
                <FiEdit className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Description Generator</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Generate and enhance product descriptions, titles, and metadata using AI
                </p>
              </div>
            </div>
            <label className={`relative inline-flex items-center ${!aiEnabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                checked={aiSettings.admin?.productDescription?.enabled ?? false}
                onChange={(e) => toggleProductDescription(e.target.checked)}
                disabled={saving || !aiEnabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
            </label>
          </div>

          {/* Product FAQ Generator */}
          <div className="flex items-start justify-between pb-6 border-b border-gray-200 last:border-b-0 last:pb-0">
            <div className="flex items-start space-x-4 flex-1">
              <div className="p-3 bg-blue-50 rounded-lg">
                <FiMessageCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">FAQ Generator</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Generate frequently asked questions and answers for products using AI
                </p>
              </div>
            </div>
            <label className={`relative inline-flex items-center ${!aiEnabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                checked={aiSettings.admin?.productFAQ?.enabled ?? false}
                onChange={(e) => toggleProductFAQ(e.target.checked)}
                disabled={saving || !aiEnabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
            </label>
          </div>

          {/* Email Generator */}
          <div className="flex items-start justify-between pb-6 border-b border-gray-200 last:border-b-0 last:pb-0">
            <div className="flex items-start space-x-4 flex-1">
              <div className="p-3 bg-yellow-50 rounded-lg">
                <FiMail className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Email Generator</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Generate marketing emails and campaigns with AI assistance
                </p>
              </div>
            </div>
            <label className={`relative inline-flex items-center ${!aiEnabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                checked={aiSettings.admin?.emailGenerator?.enabled ?? false}
                onChange={(e) => toggleEmailGenerator(e.target.checked)}
                disabled={saving || !aiEnabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
            </label>
          </div>

          {/* Support Reply */}
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1">
              <div className="p-3 bg-indigo-50 rounded-lg">
                <FiMessageCircle className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Support Reply Generator</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Generate AI-powered responses for customer support tickets
                </p>
              </div>
            </div>
            <label className={`relative inline-flex items-center ${!aiEnabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                checked={aiSettings.admin?.supportReply?.enabled ?? false}
                onChange={(e) => toggleSupportReply(e.target.checked)}
                disabled={saving || !aiEnabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <FiCpu className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-blue-900">About AI Features</h4>
            <p className="text-sm text-blue-700 mt-1">
              AI features use advanced language models to enhance your store's capabilities. 
              When enabled, these features will be available throughout the admin panel and customer-facing pages.
              Changes take effect immediately after saving.
            </p>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

