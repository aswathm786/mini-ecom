/**
 * Admin Settings Page
 * 
 * Editable settings form with enable/disable toggles and CRUD operations for API keys.
 */

import { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useThemeSettings } from '../hooks/useThemeSettings';
import { useAdminApi } from '../hooks/useAdminApi';
import { Button } from '../../components/Button';
import { PasswordInput } from '../../components/PasswordInput';
import { ToastContainer } from '../../components/Toast';
import { FiEdit, FiTrash2, FiCheck, FiX, FiShoppingBag, FiHeart, FiGift, FiTag, FiTruck } from 'react-icons/fi';

export function SettingsPage() {
  const { settings, loading, error, updateSettings, refetch } = useSettings();
  const { settings: themeSettings, updateSettings: updateThemeSettings, refetch: refetchTheme } = useThemeSettings();
  const api = useAdminApi();
  const [localSettings, setLocalSettings] = useState<any>({});
  const [localThemeSettings, setLocalThemeSettings] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }>>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [testingRazorpay, setTestingRazorpay] = useState(false);
  const [commerceFeatures, setCommerceFeatures] = useState<{
    coupons: { enabled: boolean };
    wishlist: { enabled: boolean };
    loyalty: { enabled: boolean };
    guestCheckout: { enabled: boolean };
    returns: { enabled: boolean };
  }>({
    coupons: { enabled: false },
    wishlist: { enabled: false },
    loyalty: { enabled: false },
    guestCheckout: { enabled: false },
    returns: { enabled: false },
  });
  const [loadingCommerceFeatures, setLoadingCommerceFeatures] = useState(true);
  const [shippingEnabled, setShippingEnabled] = useState(false);
  const [loadingShipping, setLoadingShipping] = useState(true);

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

  useEffect(() => {
    if (themeSettings) {
      setLocalThemeSettings(themeSettings);
    }
  }, [themeSettings]);

  // Load commerce features on mount
  useEffect(() => {
    const loadCommerceFeatures = async () => {
      try {
        const flags = await api.get('/settings/advanced/feature-flags');
        setCommerceFeatures({
          coupons: flags?.coupons || { enabled: false },
          wishlist: flags?.wishlist || { enabled: false },
          loyalty: flags?.loyalty || { enabled: false },
          guestCheckout: { enabled: flags?.checkout?.guestEnabled || false },
          returns: flags?.returns || { enabled: false },
        });
      } catch (err) {
        console.error('Failed to load commerce features:', err);
      } finally {
        setLoadingCommerceFeatures(false);
      }
    };
    loadCommerceFeatures();
  }, [api]);

  // Load shipping settings on mount
  useEffect(() => {
    const loadShipping = async () => {
      try {
        const response = await api.get('/settings/shipping');
        setShippingEnabled(response?.providers?.delhivery?.enabled || false);
      } catch (err) {
        console.error('Failed to load shipping settings:', err);
      } finally {
        setLoadingShipping(false);
      }
    };
    loadShipping();
  }, [api]);

  const validateSettings = (): { valid: boolean; error?: string } => {
    // Helper to check if a secret is set (either in localSettings with actual value, or exists in original settings)
    const isSecretSet = (key: string, localValue: string | undefined): boolean => {
      // If it exists in original settings, it was saved before (even if masked now)
      if (settings && settings[key]) {
        return true;
      }
      // Check if local value is set and not just masked dots
      if (localValue) {
        const trimmed = localValue.trim();
        // If it's not empty and not the masked value, it's set
        return trimmed.length > 0 && trimmed !== '•'.repeat(20);
      }
      return false;
    };

    // Validate Google OAuth
    if (localSettings['auth.google.enabled']) {
      if (!isSecretSet('auth.google.client_id', localSettings['auth.google.client_id'])) {
        return { valid: false, error: 'Google OAuth is enabled but Client ID is missing. Please add Client ID or disable Google OAuth.' };
      }
      if (!isSecretSet('auth.google.client_secret', localSettings['auth.google.client_secret'])) {
        return { valid: false, error: 'Google OAuth is enabled but Client Secret is missing. Please add Client Secret or disable Google OAuth.' };
      }
    }

    // Validate Razorpay
    if (localSettings['payments.razorpay.enabled']) {
      if (!isSecretSet('payments.razorpay.key_id', localSettings['payments.razorpay.key_id'])) {
        return { valid: false, error: 'Razorpay is enabled but Key ID is missing. Please add Key ID or disable Razorpay.' };
      }
      if (!isSecretSet('payments.razorpay.key_secret', localSettings['payments.razorpay.key_secret'])) {
        return { valid: false, error: 'Razorpay is enabled but Key Secret is missing. Please add Key Secret or disable Razorpay.' };
      }
    }

    // Validate Delhivery
    if (localSettings['shipping.delhivery.enabled']) {
      if (!isSecretSet('shipping.delhivery.token', localSettings['shipping.delhivery.token'])) {
        return { valid: false, error: 'Delhivery is enabled but Token is missing. Please add Token or disable Delhivery.' };
      }
      if (!isSecretSet('shipping.delhivery.client_id', localSettings['shipping.delhivery.client_id'])) {
        return { valid: false, error: 'Delhivery is enabled but Client ID is missing. Please add Client ID or disable Delhivery.' };
      }
    }

    // Validate SMTP
    if (localSettings['email.smtp.enabled']) {
      if (!localSettings['email.smtp.host'] || !localSettings['email.smtp.host'].trim()) {
        return { valid: false, error: 'SMTP is enabled but Host is missing. Please add SMTP Host or disable SMTP.' };
      }
      if (!localSettings['email.smtp.port']) {
        return { valid: false, error: 'SMTP is enabled but Port is missing. Please add SMTP Port or disable SMTP.' };
      }
      if (!isSecretSet('email.smtp.user', localSettings['email.smtp.user'])) {
        return { valid: false, error: 'SMTP is enabled but Username is missing. Please add SMTP Username or disable SMTP.' };
      }
      if (!isSecretSet('email.smtp.pass', localSettings['email.smtp.pass'])) {
        return { valid: false, error: 'SMTP is enabled but Password is missing. Please add SMTP Password or disable SMTP.' };
      }
      if (!localSettings['email.smtp.from'] || !localSettings['email.smtp.from'].trim()) {
        return { valid: false, error: 'SMTP is enabled but From Email is missing. Please add From Email or disable SMTP.' };
      }
    }

    return { valid: true };
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate settings before saving
    const validation = validateSettings();
    if (!validation.valid) {
      addToast(validation.error || 'Validation failed', 'error');
      return;
    }

    setSaving(true);
    try {
      const success = await updateSettings(localSettings);
      
      // Also save theme settings if they've changed
      const themeUpdates: any = {};
      if (localThemeSettings['theme.siteTagline'] !== themeSettings?.['theme.siteTagline']) {
        themeUpdates['theme.siteTagline'] = localThemeSettings['theme.siteTagline'];
      }
      
      if (Object.keys(themeUpdates).length > 0) {
        await updateThemeSettings(themeUpdates);
      }
      
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

  const handleKeyUpdate = (key: string, value: string) => {
    setLocalSettings({ ...localSettings, [key]: value });
  };

  const startEditing = (key: string, currentValue: string) => {
    setEditingKey(key);
    setEditingValue(currentValue || '');
  };

  const cancelEditing = () => {
    setEditingKey(null);
    setEditingValue('');
  };

  const saveEditing = async () => {
    if (editingKey) {
      // Validate that value is not empty for required fields
      if (!editingValue || editingValue.trim().length === 0) {
        addToast('Value cannot be empty', 'error');
        return;
      }
      
      handleKeyUpdate(editingKey, editingValue);
      // Immediately save to backend when editing secret/API key fields
      try {
        console.log(`[Frontend] Saving setting: ${editingKey}, value length: ${editingValue.length}`);
        await updateSettings({ [editingKey]: editingValue });
        addToast('Setting saved successfully', 'success');
      } catch (err) {
        console.error(`[Frontend] Failed to save setting ${editingKey}:`, err);
        addToast('Failed to save setting', 'error');
      }
      setEditingKey(null);
      setEditingValue('');
    }
  };

  const deleteKey = async (key: string) => {
    if (window.confirm(`Are you sure you want to delete ${key}?`)) {
      try {
        // Save to backend immediately with empty string to clear
        const success = await updateSettings({ [key]: '' });
        if (!success) {
          addToast('Failed to delete API key', 'error');
          return;
        }
        // Remove the key from local state immediately
        const updated = { ...localSettings };
        delete updated[key];
        setLocalSettings(updated);
        // Refetch settings to get updated state from backend
        await refetch();
        addToast('API key deleted successfully', 'success');
      } catch (err) {
        console.error('Error deleting API key:', err);
        addToast('Failed to delete API key', 'error');
      }
    }
  };

  const testRazorpay = async () => {
    setTestingRazorpay(true);
    try {
      const response = await api.post('/admin/settings/test-razorpay', {
        key_id: localSettings['payments.razorpay.key_id'] || '',
        key_secret: localSettings['payments.razorpay.key_secret'] || '',
      });
      if (response.ok) {
        addToast('Razorpay credentials are valid!', 'success');
      } else {
        addToast(response.error || 'Razorpay credentials are invalid', 'error');
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to test Razorpay credentials', 'error');
    } finally {
      setTestingRazorpay(false);
    }
  };

  const toggleCoupons = async (enabled: boolean) => {
    try {
      await api.patch('/settings/advanced/commerce/coupons', { enabled });
      setCommerceFeatures(prev => ({ ...prev, coupons: { enabled } }));
      addToast(`Coupons ${enabled ? 'enabled' : 'disabled'} successfully`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to toggle coupons', 'error');
    }
  };

  const toggleWishlist = async (enabled: boolean) => {
    try {
      await api.patch('/settings/advanced/commerce/wishlist', { enabled });
      setCommerceFeatures(prev => ({ ...prev, wishlist: { enabled } }));
      addToast(`Wishlist ${enabled ? 'enabled' : 'disabled'} successfully`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to toggle wishlist', 'error');
    }
  };

  const toggleLoyalty = async (enabled: boolean) => {
    try {
      await api.patch('/settings/advanced/commerce/loyalty', { enabled });
      setCommerceFeatures(prev => ({ ...prev, loyalty: { enabled } }));
      addToast(`Loyalty ${enabled ? 'enabled' : 'disabled'} successfully`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to toggle loyalty', 'error');
    }
  };

  const toggleGuestCheckout = async (enabled: boolean) => {
    try {
      await api.patch('/settings/advanced/commerce/guest-checkout', { enabled });
      setCommerceFeatures(prev => ({ ...prev, guestCheckout: { enabled } }));
      addToast(`Guest checkout ${enabled ? 'enabled' : 'disabled'} successfully`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to toggle guest checkout', 'error');
    }
  };

  const toggleReturns = async (enabled: boolean) => {
    try {
      await api.patch('/settings/advanced/commerce/returns', { enabled });
      setCommerceFeatures(prev => ({ ...prev, returns: { enabled } }));
      addToast(`Returns ${enabled ? 'enabled' : 'disabled'} successfully`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to toggle returns', 'error');
    }
  };

  const toggleShipping = async (enabled: boolean) => {
    try {
      // Update the Delhivery provider status
      await api.patch('/settings/shipping', {
        provider: 'delhivery',
        enabled
      });
      setShippingEnabled(enabled);
      
      // Also update the local settings to reflect the change
      setLocalSettings({ ...localSettings, 'shipping.delhivery.enabled': enabled });
      
      addToast(`Shipping ${enabled ? 'enabled' : 'disabled'} successfully`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to toggle shipping', 'error');
    }
  };

  const maskSecret = (value: string | undefined) => {
    if (!value) return '';
    return '•'.repeat(20);
  };

  const renderKeyField = (label: string, key: string, type: 'text' | 'password' = 'text') => {
    const isEditing = editingKey === key;
    const value = localSettings[key] || '';
    const isSecret = type === 'password';

    return (
      <div>
        <label htmlFor={key} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              {isSecret ? (
                <div className="flex-1">
                  <PasswordInput
                    id={key}
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    className="pr-10"
                    autoFocus
                  />
                </div>
              ) : (
                <input
                  id={key}
                  type="text"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  autoFocus
                />
              )}
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={saveEditing}
              >
                <FiCheck />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={cancelEditing}
              >
                <FiX />
              </Button>
            </>
          ) : (
            <>
              <input
                id={key}
                type={isSecret ? 'password' : 'text'}
                value={isSecret ? maskSecret(value) : value}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => startEditing(key, value)}
              >
                <FiEdit />
              </Button>
              {value && value.trim().length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => deleteKey(key)}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <FiTrash2 />
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderAIField = (providerName: string, providerLabel: string) => {
    const apiKeyPath = `ai.${providerName}.api_key`;
    const modelPath = `ai.${providerName}.model`;
    const apiKeyValue = localSettings[apiKeyPath] || '';
    const modelValue = localSettings[modelPath] || '';
    const isEditingKey = editingKey === apiKeyPath;
    const isEditingModel = editingKey === modelPath;

    return (
      <div className="space-y-3 p-4 border border-gray-200 rounded-md">
        <h3 className="text-sm font-semibold text-gray-800">{providerLabel}</h3>
        <div>
          <label htmlFor={apiKeyPath} className="block text-sm font-medium text-gray-700 mb-1">
            API Key
          </label>
          <div className="flex gap-2">
            {isEditingKey ? (
              <>
                <div className="flex-1">
                  <PasswordInput
                    id={apiKeyPath}
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    className="pr-10"
                    autoFocus
                  />
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={saveEditing}
                >
                  <FiCheck />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={cancelEditing}
                >
                  <FiX />
                </Button>
              </>
            ) : (
              <>
                <input
                  id={apiKeyPath}
                  type="password"
                  value={maskSecret(apiKeyValue)}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => startEditing(apiKeyPath, apiKeyValue)}
                >
                  <FiEdit />
                </Button>
                {apiKeyValue && apiKeyValue.trim().length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => deleteKey(apiKeyPath)}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <FiTrash2 />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
        <div>
          <label htmlFor={modelPath} className="block text-sm font-medium text-gray-700 mb-1">
            Model Name
          </label>
          <div className="flex gap-2">
            {isEditingModel ? (
              <>
                <input
                  id={modelPath}
                  type="text"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder={providerName === 'gemini' ? 'gemini-1.5-pro' : providerName === 'openai' ? 'gpt-4o-mini' : 'claude-3-haiku-20240307'}
                  autoFocus
                />
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={saveEditing}
                >
                  <FiCheck />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={cancelEditing}
                >
                  <FiX />
                </Button>
              </>
            ) : (
              <>
                <input
                  id={modelPath}
                  type="text"
                  value={modelValue}
                  onChange={(e) => handleKeyUpdate(modelPath, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder={providerName === 'gemini' ? 'gemini-1.5-pro' : providerName === 'openai' ? 'gpt-4o-mini' : 'claude-3-haiku-20240307'}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => startEditing(modelPath, modelValue)}
                >
                  <FiEdit />
                </Button>
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {providerName === 'gemini' && 'Examples: gemini-1.5-pro, gemini-1.5-flash, gemini-pro'}
            {providerName === 'openai' && 'Examples: gpt-4o-mini, gpt-4o, gpt-4-turbo, gpt-3.5-turbo'}
            {providerName === 'anthropic' && 'Examples: claude-3-haiku-20240307, claude-3-sonnet-20240229, claude-3-opus-20240229'}
          </p>
        </div>
      </div>
    );
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
        {/* Payment Settings - Razorpay */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Payment Settings - Razorpay</h2>
            <label className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Enable Razorpay</span>
              <input
                type="checkbox"
                checked={localSettings['payments.razorpay.enabled'] || false}
                onChange={(e) => setLocalSettings({ ...localSettings, 'payments.razorpay.enabled': e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
            </label>
          </div>
          <div className="space-y-4">
            {renderKeyField('Razorpay Key ID', 'payments.razorpay.key_id', 'text')}
            {renderKeyField('Razorpay Key Secret', 'payments.razorpay.key_secret', 'password')}
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={testRazorpay}
                isLoading={testingRazorpay}
                disabled={!localSettings['payments.razorpay.key_id'] || !localSettings['payments.razorpay.key_secret']}
              >
                Test Razorpay Credentials
              </Button>
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

        {/* Shipping Settings - Delhivery */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Shipping Settings - Delhivery</h2>
            <label className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Enable Delhivery</span>
              <input
                type="checkbox"
                checked={localSettings['shipping.delhivery.enabled'] || false}
                onChange={(e) => setLocalSettings({ ...localSettings, 'shipping.delhivery.enabled': e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
            </label>
          </div>
          <div className="space-y-4">
            {renderKeyField('Delhivery Token', 'shipping.delhivery.token', 'password')}
            {renderKeyField('Delhivery Client ID', 'shipping.delhivery.client_id', 'text')}
          </div>
        </div>

        {/* Commerce Features */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Commerce Features</h2>
            <p className="text-sm text-gray-600">Enable or disable e-commerce features for your store</p>
          </div>
          
          {(loadingCommerceFeatures || loadingShipping) ? (
            <div className="animate-pulse space-y-3">
              <div className="h-12 bg-gray-100 rounded"></div>
              <div className="h-12 bg-gray-100 rounded"></div>
              <div className="h-12 bg-gray-100 rounded"></div>
              <div className="h-12 bg-gray-100 rounded"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Shipping */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <FiTruck className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Shipping Rate Calculator</h3>
                    <p className="text-xs text-gray-600">Enable dynamic shipping rate calculation with Delhivery</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shippingEnabled}
                    onChange={(e) => toggleShipping(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              {/* Coupons */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FiTag className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Coupons & Discounts</h3>
                    <p className="text-xs text-gray-600">Create and manage discount coupons and promo codes</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={commerceFeatures.coupons.enabled}
                    onChange={(e) => toggleCoupons(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              {/* Wishlist */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <FiHeart className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Wishlist</h3>
                    <p className="text-xs text-gray-600">Allow customers to save items to their wishlist</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={commerceFeatures.wishlist.enabled}
                    onChange={(e) => toggleWishlist(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              {/* Loyalty Program */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FiGift className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Loyalty Program</h3>
                    <p className="text-xs text-gray-600">Reward customers with points for purchases</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={commerceFeatures.loyalty.enabled}
                    onChange={(e) => toggleLoyalty(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              {/* Guest Checkout */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FiShoppingBag className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Guest Checkout</h3>
                    <p className="text-xs text-gray-600">Allow customers to checkout without creating an account</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={commerceFeatures.guestCheckout.enabled}
                    onChange={(e) => toggleGuestCheckout(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              {/* Returns & Refunds */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <FiShoppingBag className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Returns & Refunds</h3>
                    <p className="text-xs text-gray-600">Allow customers to request returns and refunds</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={commerceFeatures.returns.enabled}
                    onChange={(e) => toggleReturns(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* AI Provider Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">AI Provider Settings</h2>
            <label className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Enable AI APIs</span>
              <input
                type="checkbox"
                checked={localSettings['ai.enabled'] || false}
                onChange={(e) => setLocalSettings({ ...localSettings, 'ai.enabled': e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
            </label>
          </div>
          <div className="space-y-4">
            {renderAIField('gemini', 'Gemini')}
            {renderAIField('openai', 'OpenAI')}
            {renderAIField('anthropic', 'Anthropic')}
          </div>
        </div>

        {/* Google OAuth Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Google OAuth Settings</h2>
            <label className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Enable Google Login</span>
              <input
                type="checkbox"
                checked={localSettings['auth.google.enabled'] || false}
                onChange={(e) => setLocalSettings({ ...localSettings, 'auth.google.enabled': e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
            </label>
          </div>
          <div className="space-y-4">
            {renderKeyField('Google Client ID', 'auth.google.client_id', 'text')}
            {renderKeyField('Google Client Secret', 'auth.google.client_secret', 'password')}
          </div>
        </div>

        {/* Email Settings - SMTP */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Email Settings - SMTP</h2>
            <label className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Enable Email</span>
              <input
                type="checkbox"
                checked={localSettings['email.smtp.enabled'] || false}
                onChange={(e) => setLocalSettings({ ...localSettings, 'email.smtp.enabled': e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
            </label>
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="smtp-host" className="block text-sm font-medium text-gray-700 mb-1">
                SMTP Host
              </label>
              <input
                id="smtp-host"
                type="text"
                value={localSettings['email.smtp.host'] || ''}
                onChange={(e) => {
                  let value = e.target.value;
                  // Auto-correct common mistakes
                  if (value === 'smtp.google.com') {
                    value = 'smtp.gmail.com';
                  }
                  setLocalSettings({ ...localSettings, 'email.smtp.host': value });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="smtp.gmail.com"
              />
              {localSettings['email.smtp.host'] === 'smtp.google.com' && (
                <p className="mt-1 text-sm text-amber-600">
                  ⚠️ For Gmail, use "smtp.gmail.com" (not smtp.google.com)
                </p>
              )}
            </div>
            <div>
              <label htmlFor="smtp-port" className="block text-sm font-medium text-gray-700 mb-1">
                SMTP Port
              </label>
              <input
                id="smtp-port"
                type="number"
                value={localSettings['email.smtp.port'] || ''}
                onChange={(e) => setLocalSettings({ ...localSettings, 'email.smtp.port': parseInt(e.target.value) || 587 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="587"
              />
            </div>
            {renderKeyField('SMTP Username', 'email.smtp.user', 'text')}
            {renderKeyField('SMTP Password', 'email.smtp.pass', 'password')}
            <div>
              <label htmlFor="smtp-from" className="block text-sm font-medium text-gray-700 mb-1">
                From Email
              </label>
              <input
                id="smtp-from"
                type="email"
                value={localSettings['email.smtp.from'] || ''}
                onChange={(e) => setLocalSettings({ ...localSettings, 'email.smtp.from': e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="noreply@yourdomain.com"
              />
            </div>
          </div>
        </div>

        {/* Password Policy Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Password Policy</h2>
            <label className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Enable Password Policy</span>
              <input
                type="checkbox"
                checked={localSettings['auth.password.policy.enabled'] || false}
                onChange={(e) => setLocalSettings({ ...localSettings, 'auth.password.policy.enabled': e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
            </label>
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="password-min-length" className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Length
              </label>
              <input
                id="password-min-length"
                type="number"
                value={localSettings['auth.password.policy.minLength'] || 8}
                onChange={(e) => setLocalSettings({ ...localSettings, 'auth.password.policy.minLength': parseInt(e.target.value) || 8 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                min="6"
                max="128"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={localSettings['auth.password.policy.requireUppercase'] || false}
                  onChange={(e) => setLocalSettings({ ...localSettings, 'auth.password.policy.requireUppercase': e.target.checked })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Require uppercase letter</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={localSettings['auth.password.policy.requireLowercase'] || false}
                  onChange={(e) => setLocalSettings({ ...localSettings, 'auth.password.policy.requireLowercase': e.target.checked })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Require lowercase letter</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={localSettings['auth.password.policy.requireNumber'] || false}
                  onChange={(e) => setLocalSettings({ ...localSettings, 'auth.password.policy.requireNumber': e.target.checked })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Require number</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={localSettings['auth.password.policy.requireSpecial'] || false}
                  onChange={(e) => setLocalSettings({ ...localSettings, 'auth.password.policy.requireSpecial': e.target.checked })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Require special character</span>
              </label>
            </div>
          </div>
        </div>

        {/* Store Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Store Information</h2>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> All store branding settings (name, logo, favicon, backend store name, and invoice prefix) have been moved to the{' '}
                <a href="/admin/store-settings" className="underline font-semibold">Store Branding</a> page.
              </p>
            </div>
          </div>
        </div>

        {/* Authentication Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Authentication Settings</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="session-expires-in" className="block text-sm font-medium text-gray-700 mb-1">
                Session Expiration
              </label>
              <input
                id="session-expires-in"
                type="text"
                value={localSettings['auth.session.expires_in'] || '7d'}
                onChange={(e) => setLocalSettings({ ...localSettings, 'auth.session.expires_in': e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="7d"
              />
              <p className="mt-1 text-sm text-gray-500">
                Format: number followed by unit (s=seconds, m=minutes, h=hours, d=days). 
                Examples: 7d, 30d, 1h, 30m. Default: 7d. This applies to new sessions only.
              </p>
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
