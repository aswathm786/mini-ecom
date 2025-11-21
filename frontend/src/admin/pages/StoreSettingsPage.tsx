/**
 * Store Settings Page
 * 
 * Dedicated page for managing store branding: name, logo, and favicon.
 */

import { useState, useEffect } from 'react';
import { useStoreSettings } from '../hooks/useStoreSettings';
import { Button } from '../../components/Button';
import { ToastContainer } from '../../components/Toast';
import { FiTrash2, FiUpload, FiSave } from 'react-icons/fi';

export function StoreSettingsPage() {
  const { settings, loading, error, updateSettings, uploadLogo, uploadFavicon, refetch } = useStoreSettings();
  const [localSettings, setLocalSettings] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }>>([]);
  const [logoInputType, setLogoInputType] = useState<'link' | 'upload'>('upload');
  const [faviconInputType, setFaviconInputType] = useState<'link' | 'upload'>('upload');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [faviconUrl, setFaviconUrl] = useState<string>('');

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
      // Set input type based on existing value (URL vs uploaded file)
      if (settings.logo) {
        const isUrl = settings.logo.startsWith('http://') || settings.logo.startsWith('https://');
        setLogoInputType(isUrl ? 'link' : 'upload');
        if (isUrl) {
          setLogoUrl(settings.logo);
        }
      }
      if (settings.favicon) {
        const isUrl = settings.favicon.startsWith('http://') || settings.favicon.startsWith('https://');
        setFaviconInputType(isUrl ? 'link' : 'upload');
        if (isUrl) {
          setFaviconUrl(settings.favicon);
        }
      }
    }
  }, [settings]);

  const updateFavicon = (url: string) => {
    // Remove existing favicon links
    const existingLinks = document.querySelectorAll("link[rel*='icon']");
    existingLinks.forEach(link => link.remove());
    
    // Add new favicon
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = url.endsWith('.svg') ? 'image/svg+xml' : 'image/x-icon';
    link.href = url;
    document.head.appendChild(link);
  };

  // Update favicon when settings change
  useEffect(() => {
    if (localSettings?.favicon) {
      updateFavicon(localSettings.favicon);
    }
  }, [localSettings?.favicon]);

  const handleFileUpload = async (file: File, type: 'logo' | 'favicon') => {
    setUploading(type);
    try {
      let url: string | null = null;
      if (type === 'logo') {
        url = await uploadLogo(file);
      } else {
        url = await uploadFavicon(file);
      }
      
      if (url) {
        addToast(`${type === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully`, 'success');
        const updated = { ...localSettings, [type]: url };
        setLocalSettings(updated);
        
        // Update favicon in browser tab if it's a favicon
        if (type === 'favicon' && url) {
          updateFavicon(url);
        }
        // Switch to upload mode after successful upload
        if (type === 'logo') {
          setLogoInputType('upload');
        } else {
          setFaviconInputType('upload');
        }
      } else {
        addToast(`Failed to upload ${type}`, 'error');
      }
    } catch (err) {
      addToast(`Failed to upload ${type}`, 'error');
    } finally {
      setUploading(null);
    }
  };

  const handleUrlUpdate = async (url: string, type: 'logo' | 'favicon') => {
    if (!url.trim()) {
      addToast(`Please enter a valid ${type === 'logo' ? 'logo' : 'favicon'} URL`, 'error');
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      addToast(`Please enter a valid URL for ${type === 'logo' ? 'logo' : 'favicon'}`, 'error');
      return;
    }

    setSaving(true);
    try {
      const success = await updateSettings({ [type]: url });
      if (success) {
        addToast(`${type === 'logo' ? 'Logo' : 'Favicon'} URL updated successfully`, 'success');
        const updated = { ...localSettings, [type]: url };
        setLocalSettings(updated);
        
        // Update favicon in browser tab if it's a favicon
        if (type === 'favicon' && url) {
          updateFavicon(url);
        }
        await refetch();
      } else {
        addToast(`Failed to update ${type === 'logo' ? 'logo' : 'favicon'} URL`, 'error');
      }
    } catch (err) {
      addToast(`Failed to update ${type === 'logo' ? 'logo' : 'favicon'} URL`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteImage = async (type: 'logo' | 'favicon') => {
    if (!confirm(`Are you sure you want to delete the ${type}?`)) {
      return;
    }
    
    try {
      // Update store settings to remove the image (set to null to trigger deletion)
      const success = await updateSettings({ [type]: null });
      
      if (success) {
        // Refetch settings to ensure we have the latest state
        await refetch();
        
        // Update local state after successful deletion
        const updated = { ...localSettings };
        delete updated[type];
        setLocalSettings(updated);
        
        // Update favicon in browser tab if it's a favicon
        if (type === 'favicon') {
          updateFavicon('/vite.svg'); // Reset to default
        }
        
        addToast(`${type === 'logo' ? 'Logo' : 'Favicon'} deleted successfully`, 'success');
      } else {
        addToast(`Failed to delete ${type}`, 'error');
      }
    } catch (err) {
      console.error('Error deleting image:', err);
      addToast(`Failed to delete ${type}`, 'error');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setSaving(true);
    try {
      // Build updates object - include URL inputs if they're in link mode
      const updates: any = {};
      
      // Check text fields
      if (localSettings.name !== settings?.name) {
        updates.name = localSettings.name;
      }
      if (localSettings.tagline !== settings?.tagline) {
        updates.tagline = localSettings.tagline;
      }
      if (localSettings.link !== settings?.link) {
        updates.link = localSettings.link;
      }
      if (localSettings.backendStoreName !== settings?.backendStoreName) {
        updates.backendStoreName = localSettings.backendStoreName;
      }
      if (localSettings.invoicePrefix !== settings?.invoicePrefix) {
        updates.invoicePrefix = localSettings.invoicePrefix;
      }
      
      // Check logo - if in link mode and URL is entered, use that; otherwise use localSettings
      if (logoInputType === 'link' && logoUrl.trim()) {
        // Validate URL
        try {
          new URL(logoUrl);
          if (logoUrl !== settings?.logo) {
            updates.logo = logoUrl;
          }
        } catch {
          // Invalid URL, skip it
        }
      } else if (localSettings.logo !== settings?.logo) {
        updates.logo = localSettings.logo;
      }
      
      // Check favicon - if in link mode and URL is entered, use that; otherwise use localSettings
      if (faviconInputType === 'link' && faviconUrl.trim()) {
        // Validate URL
        try {
          new URL(faviconUrl);
          if (faviconUrl !== settings?.favicon) {
            updates.favicon = faviconUrl;
          }
        } catch {
          // Invalid URL, skip it
        }
      } else if (localSettings.favicon !== settings?.favicon) {
        updates.favicon = localSettings.favicon;
      }
      
      if (Object.keys(updates).length > 0) {
        const success = await updateSettings(updates);
        if (success) {
          addToast('Store settings saved successfully', 'success');
          
          // Update local state with saved values
          const updated = { ...localSettings, ...updates };
          setLocalSettings(updated);
          
          // Update URL states if they were saved
          if (updates.logo && logoInputType === 'link') {
            setLogoUrl(updates.logo);
          }
          if (updates.favicon && faviconInputType === 'link') {
            setFaviconUrl(updates.favicon);
            updateFavicon(updates.favicon);
          }
          
          // Refetch to get latest state
          await refetch();
          
          // Reload page if store name/tagline changed to apply changes immediately
          const storeSettingsChanged = 
            updates.name !== undefined ||
            updates.tagline !== undefined ||
            updates.link !== undefined;
          if (storeSettingsChanged) {
            window.location.reload();
          }
        } else {
          addToast('Failed to save store settings', 'error');
        }
      } else {
        addToast('No changes to save', 'info');
      }
    } catch (err) {
      addToast('Failed to save store settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading store settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
        <p className="text-red-800 font-medium">Error loading store settings: {error}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Store Branding</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your store name, logo, and favicon. These settings are used across your website, emails, and invoices.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          {/* Store Name */}
          <div>
            <label htmlFor="store-name" className="block text-sm font-medium text-gray-700 mb-1">
              Store Name <span className="text-red-500">*</span>
            </label>
            <input
              id="store-name"
              type="text"
              value={localSettings?.name || ''}
              onChange={(e) => setLocalSettings({ ...localSettings, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Handmade Harmony"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              This is the name displayed in the navbar, emails, and invoices. If not set, it will fallback to the backend store name.
            </p>
          </div>

          {/* Store Tagline */}
          <div>
            <label htmlFor="store-tagline" className="block text-sm font-medium text-gray-700 mb-1">
              Store Tagline
            </label>
            <input
              id="store-tagline"
              type="text"
              value={localSettings?.tagline || ''}
              onChange={(e) => setLocalSettings({ ...localSettings, tagline: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Beautiful handmade products"
            />
            <p className="text-xs text-gray-500 mt-1">
              A short description or tagline for your store (displayed below the store name in the navbar).
            </p>
          </div>

          {/* Store Link */}
          <div>
            <label htmlFor="store-link" className="block text-sm font-medium text-gray-700 mb-1">
              Store Link
            </label>
            <input
              id="store-link"
              type="url"
              value={localSettings?.link || ''}
              onChange={(e) => setLocalSettings({ ...localSettings, link: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="https://yourstore.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              Your store website URL (e.g., https://yourstore.com). This link can be used in emails and other communications.
            </p>
          </div>

          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Store Logo
            </label>
            <div className="flex items-center gap-4">
              {localSettings?.logo && (
                <div className="relative">
                  <img
                    src={localSettings.logo}
                    alt="Store Logo"
                    className="h-20 w-auto object-contain border border-gray-200 rounded-lg p-2"
                    onError={(e) => {
                      // Hide broken image if URL is invalid
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteImage('logo')}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-lg"
                    title="Delete logo"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="flex-1 space-y-3">
                {localSettings?.logo && (
                  <div className="p-2 bg-gray-50 border border-gray-200 rounded text-xs">
                    <p className="text-gray-600 font-medium mb-1">Current Logo:</p>
                    <p className="text-gray-800 font-mono break-all">{localSettings.logo}</p>
                  </div>
                )}
                
                {/* Input Type Selection */}
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="logo-input-type"
                      checked={logoInputType === 'link'}
                      onChange={() => {
                        setLogoInputType('link');
                        if (localSettings?.logo && (localSettings.logo.startsWith('http://') || localSettings.logo.startsWith('https://'))) {
                          setLogoUrl(localSettings.logo);
                        }
                      }}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Use Link/URL</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="logo-input-type"
                      checked={logoInputType === 'upload'}
                      onChange={() => setLogoInputType('upload')}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Upload Image</span>
                  </label>
                </div>

                {/* Link Input */}
                {logoInputType === 'link' && (
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => handleUrlUpdate(logoUrl, 'logo')}
                      disabled={!logoUrl.trim() || saving}
                    >
                      Save Logo URL
                    </Button>
                  </div>
                )}

                {/* File Upload Input */}
                {logoInputType === 'upload' && (
                  <>
                    <input
                      key="logo-input"
                      id="logo-file-input"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(file, 'logo');
                          // Reset input after selection
                          e.target.value = '';
                        }
                      }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                      disabled={uploading === 'logo'}
                    />
                    {uploading === 'logo' && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
                  </>
                )}
                
                <p className="text-xs text-gray-500">
                  {logoInputType === 'link' 
                    ? 'Enter a direct URL to your logo image (must be publicly accessible).'
                    : 'Upload your store logo. Recommended size: 200x60px. This logo appears in the navbar and emails.'}
                </p>
              </div>
            </div>
          </div>

          {/* Favicon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Favicon (Browser Tab Icon)
            </label>
            <div className="flex items-center gap-4">
              {localSettings?.favicon && (
                <div className="relative">
                  <img
                    src={localSettings.favicon}
                    alt="Favicon"
                    className="w-12 h-12 object-contain border border-gray-200 rounded p-1"
                    onError={(e) => {
                      // Hide broken image if URL is invalid
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteImage('favicon')}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-lg"
                    title="Delete favicon"
                  >
                    <FiTrash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
              <div className="flex-1 space-y-3">
                {localSettings?.favicon && (
                  <div className="p-2 bg-gray-50 border border-gray-200 rounded text-xs">
                    <p className="text-gray-600 font-medium mb-1">Current Favicon:</p>
                    <p className="text-gray-800 font-mono break-all">{localSettings.favicon}</p>
                  </div>
                )}
                
                {/* Input Type Selection */}
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="favicon-input-type"
                      checked={faviconInputType === 'link'}
                      onChange={() => {
                        setFaviconInputType('link');
                        if (localSettings?.favicon && (localSettings.favicon.startsWith('http://') || localSettings.favicon.startsWith('https://'))) {
                          setFaviconUrl(localSettings.favicon);
                        }
                      }}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Use Link/URL</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="favicon-input-type"
                      checked={faviconInputType === 'upload'}
                      onChange={() => setFaviconInputType('upload')}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Upload Image</span>
                  </label>
                </div>

                {/* Link Input */}
                {faviconInputType === 'link' && (
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={faviconUrl}
                      onChange={(e) => setFaviconUrl(e.target.value)}
                      placeholder="https://example.com/favicon.ico"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => handleUrlUpdate(faviconUrl, 'favicon')}
                      disabled={!faviconUrl.trim() || saving}
                    >
                      Save Favicon URL
                    </Button>
                  </div>
                )}

                {/* File Upload Input */}
                {faviconInputType === 'upload' && (
                  <>
                    <input
                      key="favicon-input"
                      id="favicon-file-input"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(file, 'favicon');
                          // Reset input after selection
                          e.target.value = '';
                        }
                      }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                      disabled={uploading === 'favicon'}
                    />
                    {uploading === 'favicon' && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
                  </>
                )}
                
                <p className="text-xs text-gray-500">
                  {faviconInputType === 'link'
                    ? 'Enter a direct URL to your favicon image (must be publicly accessible).'
                    : 'Upload your favicon. Recommended size: 32x32px or 16x16px. This icon appears in the browser tab.'}
                </p>
              </div>
            </div>
          </div>

          {/* Backend Store Name */}
          <div>
            <label htmlFor="backend-store-name" className="block text-sm font-medium text-gray-700 mb-1">
              Store Name (Backend)
            </label>
            <input
              id="backend-store-name"
              type="text"
              value={localSettings?.backendStoreName || ''}
              onChange={(e) => setLocalSettings({ ...localSettings, backendStoreName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Aromax Spice"
            />
            <p className="text-xs text-gray-500 mt-1">
              Used for invoices and backend references. This is a fallback if the store name above is not set.
            </p>
          </div>

          {/* Invoice Prefix */}
          <div>
            <label htmlFor="invoice-prefix" className="block text-sm font-medium text-gray-700 mb-1">
              Invoice Prefix
            </label>
            <input
              id="invoice-prefix"
              type="text"
              value={localSettings?.invoicePrefix || ''}
              onChange={(e) => setLocalSettings({ ...localSettings, invoicePrefix: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="INV"
            />
            <p className="text-xs text-gray-500 mt-1">
              Prefix for invoice numbers (e.g., "INV" will generate invoices like "INV-1234567890-abc123").
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Button
              type="submit"
              disabled={saving || uploading !== null}
              className="flex items-center gap-2"
            >
              <FiSave className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">About Store Branding</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Store name is used in the navbar, emails, invoices, and throughout the application</li>
          <li>If no store name is set, the system will use the "Store Name (Backend)" as a fallback</li>
          <li>Store Name (Backend) is used for invoices and backend references when the main store name is not set</li>
          <li>Invoice Prefix is used to generate invoice numbers (e.g., "INV-1234567890-abc123")</li>
          <li>Logo and Favicon can be set using either a direct URL link or by uploading an image file</li>
          <li>Logo appears in the navbar and email templates</li>
          <li>Favicon appears in the browser tab</li>
          <li>You can delete existing logo/favicon and replace them with new ones</li>
          <li>Changes take effect immediately after saving</li>
        </ul>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

