/**
 * Theme Settings Page
 * 
 * Admin page for customizing website theme, colors, logo, and images.
 */

import { useState, useEffect } from 'react';
import { useThemeSettings } from '../hooks/useThemeSettings';
import { Button } from '../../components/Button';
import { ToastContainer } from '../../components/Toast';

const PRESET_COLOR_PALETTES = [
  {
    name: 'Classic Red',
    primary: '#DC2626',
    secondary: '#1F2937',
    accent: '#F59E0B',
  },
  {
    name: 'Ocean Blue',
    primary: '#2563EB',
    secondary: '#1E40AF',
    accent: '#06B6D4',
  },
  {
    name: 'Forest Green',
    primary: '#16A34A',
    secondary: '#15803D',
    accent: '#84CC16',
  },
  {
    name: 'Purple Dream',
    primary: '#9333EA',
    secondary: '#7C3AED',
    accent: '#EC4899',
  },
  {
    name: 'Sunset Orange',
    primary: '#EA580C',
    secondary: '#C2410C',
    accent: '#F97316',
  },
  {
    name: 'Midnight',
    primary: '#0F172A',
    secondary: '#1E293B',
    accent: '#3B82F6',
  },
];

export function ThemeSettingsPage() {
  const { settings, loading, error, updateSettings, uploadLogo, uploadImage } = useThemeSettings();
  const [localSettings, setLocalSettings] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }>>([]);
  const [uploading, setUploading] = useState<string | null>(null);

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
        addToast('Theme settings saved successfully! Refresh the page to see changes.', 'success');
      } else {
        addToast('Failed to save theme settings', 'error');
      }
    } catch (err) {
      addToast('Failed to save theme settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleColorChange = (key: string, value: string) => {
    setLocalSettings({ ...localSettings, [key]: value });
  };

  const applyPreset = (palette: typeof PRESET_COLOR_PALETTES[0]) => {
    setLocalSettings({
      ...localSettings,
      'theme.primary': palette.primary,
      'theme.secondary': palette.secondary,
      'theme.accent': palette.accent,
    });
  };

  const handleFileUpload = async (file: File, type: 'logo' | 'heroImage' | 'aboutImage' | 'footerImage' | 'favicon') => {
    setUploading(type);
    try {
      let url: string | null = null;
      if (type === 'logo') {
        url = await uploadLogo(file);
      } else {
        url = await uploadImage(file, type);
      }
      
      if (url) {
        addToast(`${type} uploaded successfully`, 'success');
        const settingKey = `theme.${type}`;
        setLocalSettings({ ...localSettings, [settingKey]: url });
      } else {
        addToast(`Failed to upload ${type}`, 'error');
      }
    } catch (err) {
      addToast(`Failed to upload ${type}`, 'error');
    } finally {
      setUploading(null);
    }
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
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Theme & Design Settings</h1>
        <p className="text-gray-600 mt-2">Customize your website's appearance, colors, logo, and images</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Color Palette */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Color Palette</h2>
          
          {/* Preset Palettes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Quick Presets</label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {PRESET_COLOR_PALETTES.map((palette) => (
                <button
                  key={palette.name}
                  type="button"
                  onClick={() => applyPreset(palette)}
                  className="p-3 border-2 border-gray-200 rounded-lg hover:border-primary-500 transition-colors"
                >
                  <div className="flex gap-1 mb-2">
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: palette.primary }}></div>
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: palette.secondary }}></div>
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: palette.accent }}></div>
                  </div>
                  <p className="text-xs text-gray-600">{palette.name}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label htmlFor="primary-color" className="block text-sm font-medium text-gray-700 mb-2">
                Primary Color
              </label>
              <div className="flex gap-2">
                <input
                  id="primary-color"
                  type="color"
                  value={localSettings['theme.primary'] || '#DC2626'}
                  onChange={(e) => handleColorChange('theme.primary', e.target.value)}
                  className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={localSettings['theme.primary'] || '#DC2626'}
                  onChange={(e) => handleColorChange('theme.primary', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="#DC2626"
                />
              </div>
            </div>

            <div>
              <label htmlFor="secondary-color" className="block text-sm font-medium text-gray-700 mb-2">
                Secondary Color
              </label>
              <div className="flex gap-2">
                <input
                  id="secondary-color"
                  type="color"
                  value={localSettings['theme.secondary'] || '#1F2937'}
                  onChange={(e) => handleColorChange('theme.secondary', e.target.value)}
                  className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={localSettings['theme.secondary'] || '#1F2937'}
                  onChange={(e) => handleColorChange('theme.secondary', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="#1F2937"
                />
              </div>
            </div>

            <div>
              <label htmlFor="accent-color" className="block text-sm font-medium text-gray-700 mb-2">
                Accent Color
              </label>
              <div className="flex gap-2">
                <input
                  id="accent-color"
                  type="color"
                  value={localSettings['theme.accent'] || '#F59E0B'}
                  onChange={(e) => handleColorChange('theme.accent', e.target.value)}
                  className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={localSettings['theme.accent'] || '#F59E0B'}
                  onChange={(e) => handleColorChange('theme.accent', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="#F59E0B"
                />
              </div>
            </div>

            <div>
              <label htmlFor="background-color" className="block text-sm font-medium text-gray-700 mb-2">
                Background Color
              </label>
              <div className="flex gap-2">
                <input
                  id="background-color"
                  type="color"
                  value={localSettings['theme.background'] || '#FFFFFF'}
                  onChange={(e) => handleColorChange('theme.background', e.target.value)}
                  className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={localSettings['theme.background'] || '#FFFFFF'}
                  onChange={(e) => handleColorChange('theme.background', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>

            <div>
              <label htmlFor="text-color" className="block text-sm font-medium text-gray-700 mb-2">
                Text Color
              </label>
              <div className="flex gap-2">
                <input
                  id="text-color"
                  type="color"
                  value={localSettings['theme.text'] || '#111827'}
                  onChange={(e) => handleColorChange('theme.text', e.target.value)}
                  className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={localSettings['theme.text'] || '#111827'}
                  onChange={(e) => handleColorChange('theme.text', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="#111827"
                />
              </div>
            </div>

            <div>
              <label htmlFor="text-light-color" className="block text-sm font-medium text-gray-700 mb-2">
                Light Text Color
              </label>
              <div className="flex gap-2">
                <input
                  id="text-light-color"
                  type="color"
                  value={localSettings['theme.textLight'] || '#6B7280'}
                  onChange={(e) => handleColorChange('theme.textLight', e.target.value)}
                  className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={localSettings['theme.textLight'] || '#6B7280'}
                  onChange={(e) => handleColorChange('theme.textLight', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="#6B7280"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Branding</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
              <div className="flex items-center gap-4">
                {localSettings['theme.logo'] && (
                  <img
                    src={localSettings['theme.logo']}
                    alt="Logo"
                    className="h-16 object-contain"
                  />
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'logo');
                    }}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                    disabled={uploading === 'logo'}
                  />
                  {uploading === 'logo' && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Favicon</label>
              <div className="flex items-center gap-4">
                {localSettings['theme.favicon'] && (
                  <img
                    src={localSettings['theme.favicon']}
                    alt="Favicon"
                    className="w-8 h-8 object-contain"
                  />
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'favicon');
                    }}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                    disabled={uploading === 'favicon'}
                  />
                  {uploading === 'favicon' && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="site-name" className="block text-sm font-medium text-gray-700 mb-2">
                Site Name
              </label>
              <input
                id="site-name"
                type="text"
                value={localSettings['theme.siteName'] || ''}
                onChange={(e) => setLocalSettings({ ...localSettings, 'theme.siteName': e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Handmade Harmony"
              />
            </div>

            <div>
              <label htmlFor="site-tagline" className="block text-sm font-medium text-gray-700 mb-2">
                Site Tagline
              </label>
              <input
                id="site-tagline"
                type="text"
                value={localSettings['theme.siteTagline'] || ''}
                onChange={(e) => setLocalSettings({ ...localSettings, 'theme.siteTagline': e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Beautiful handmade products"
              />
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Website Images</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hero Image (Homepage Banner)</label>
              {localSettings['theme.heroImage'] && (
                <img
                  src={localSettings['theme.heroImage']}
                  alt="Hero"
                  className="w-full h-48 object-cover rounded-lg mb-2"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'heroImage');
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                disabled={uploading === 'heroImage'}
              />
              {uploading === 'heroImage' && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">About Page Image</label>
              {localSettings['theme.aboutImage'] && (
                <img
                  src={localSettings['theme.aboutImage']}
                  alt="About"
                  className="w-full h-48 object-cover rounded-lg mb-2"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'aboutImage');
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                disabled={uploading === 'aboutImage'}
              />
              {uploading === 'aboutImage' && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Footer Image</label>
              {localSettings['theme.footerImage'] && (
                <img
                  src={localSettings['theme.footerImage']}
                  alt="Footer"
                  className="w-full h-48 object-cover rounded-lg mb-2"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'footerImage');
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                disabled={uploading === 'footerImage'}
              />
              {uploading === 'footerImage' && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
            </div>
          </div>
        </div>

        {/* Layout Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Layout & Design</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="header-style" className="block text-sm font-medium text-gray-700 mb-2">
                Header Style
              </label>
              <select
                id="header-style"
                value={localSettings['theme.headerStyle'] || 'default'}
                onChange={(e) => setLocalSettings({ ...localSettings, 'theme.headerStyle': e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="default">Default</option>
                <option value="centered">Centered</option>
                <option value="minimal">Minimal</option>
              </select>
            </div>

            <div>
              <label htmlFor="footer-style" className="block text-sm font-medium text-gray-700 mb-2">
                Footer Style
              </label>
              <select
                id="footer-style"
                value={localSettings['theme.footerStyle'] || 'default'}
                onChange={(e) => setLocalSettings({ ...localSettings, 'theme.footerStyle': e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="default">Default</option>
                <option value="minimal">Minimal</option>
                <option value="extended">Extended</option>
              </select>
            </div>

            <div>
              <label htmlFor="layout-width" className="block text-sm font-medium text-gray-700 mb-2">
                Layout Width
              </label>
              <select
                id="layout-width"
                value={localSettings['theme.layoutWidth'] || 'container'}
                onChange={(e) => setLocalSettings({ ...localSettings, 'theme.layoutWidth': e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="full">Full Width</option>
                <option value="container">Container</option>
                <option value="narrow">Narrow</option>
              </select>
            </div>

            <div>
              <label htmlFor="border-radius" className="block text-sm font-medium text-gray-700 mb-2">
                Border Radius
              </label>
              <select
                id="border-radius"
                value={localSettings['theme.borderRadius'] || 'md'}
                onChange={(e) => setLocalSettings({ ...localSettings, 'theme.borderRadius': e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="none">None</option>
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
                <option value="xl">Extra Large</option>
              </select>
            </div>

            <div>
              <label htmlFor="shadow" className="block text-sm font-medium text-gray-700 mb-2">
                Shadow Style
              </label>
              <select
                id="shadow"
                value={localSettings['theme.shadow'] || 'md'}
                onChange={(e) => setLocalSettings({ ...localSettings, 'theme.shadow': e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="none">None</option>
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                id="animation"
                type="checkbox"
                checked={localSettings['theme.animation'] !== false}
                onChange={(e) => setLocalSettings({ ...localSettings, 'theme.animation': e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="animation" className="ml-2 block text-sm text-gray-700">
                Enable Animations
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Preview Changes
          </Button>
          <Button type="submit" variant="primary" isLoading={saving}>
            Save Theme Settings
          </Button>
        </div>
      </form>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

