/**
 * Theme Settings Page
 * 
 * Admin page for customizing website theme, colors, logo, and images.
 */

import { useState, useEffect } from 'react';
import { useThemeSettings, ThemeSettings } from '../hooks/useThemeSettings';
import { Button } from '../../components/Button';
import { ToastContainer } from '../../components/Toast';
import { useAdminApi } from '../hooks/useAdminApi';
import { Modal } from '../../components/Modal';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

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

interface ThemeRecord {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  scheduledAt?: string | null;
  updatedAt: string;
  palette?: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    success: string;
    warning: string;
    danger: string;
    text: string;
  };
}

export function ThemeSettingsPage() {
  const { settings, loading, error, updateSettings, uploadImage, refetch } = useThemeSettings();
  const api = useAdminApi();
  const [localSettings, setLocalSettings] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }>>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [themes, setThemes] = useState<ThemeRecord[]>([]);
  const [themesLoading, setThemesLoading] = useState(true);
  const [editingTheme, setEditingTheme] = useState<ThemeRecord | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [deletingTheme, setDeletingTheme] = useState<string | null>(null);

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
    loadThemeLibrary();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const success = await updateSettings(localSettings);
      if (success) {
        addToast('Theme settings saved successfully!', 'success');
        // Reload theme settings to apply immediately
        window.location.reload();
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
    const updated = { ...localSettings, [key]: value };
    setLocalSettings(updated);
    // Apply theme immediately for preview
    const root = document.documentElement;
    if (key === 'theme.primary') {
      root.style.setProperty('--color-primary', value);
    } else if (key === 'theme.secondary') {
      root.style.setProperty('--color-secondary', value);
    } else if (key === 'theme.accent') {
      root.style.setProperty('--color-accent', value);
    } else if (key === 'theme.background') {
      root.style.setProperty('--color-background', value);
    } else if (key === 'theme.text') {
      root.style.setProperty('--color-text', value);
    }
  };

  const applyPreset = async (palette: typeof PRESET_COLOR_PALETTES[0]) => {
    const updated = {
      ...localSettings,
      'theme.primary': palette.primary,
      'theme.secondary': palette.secondary,
      'theme.accent': palette.accent,
    };
    setLocalSettings(updated);
    
    // Apply theme immediately for preview
    const root = document.documentElement;
    root.style.setProperty('--color-primary', palette.primary);
    root.style.setProperty('--color-secondary', palette.secondary);
    root.style.setProperty('--color-accent', palette.accent);
    
    // Save to backend
    try {
      await updateSettings(updated);
      addToast('Color palette applied successfully', 'success');
    } catch (err) {
      addToast('Failed to save color palette', 'error');
    }
  };

  const handleFileUpload = async (file: File, type: 'heroImage' | 'aboutImage' | 'footerImage') => {
    setUploading(type);
    try {
      const url = await uploadImage(file, type);
      
      if (url) {
        addToast(`${type} uploaded successfully`, 'success');
        const settingKey = `theme.${type}`;
        const updated = { ...localSettings, [settingKey]: url };
        setLocalSettings(updated);
      } else {
        addToast(`Failed to upload ${type}`, 'error');
      }
    } catch (err) {
      addToast(`Failed to upload ${type}`, 'error');
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteImage = async (type: 'heroImage' | 'aboutImage' | 'footerImage') => {
    if (!confirm(`Are you sure you want to delete the ${type}?`)) {
      return;
    }
    
    try {
      const settingKey = `theme.${type}` as keyof ThemeSettings;
      
      // Update settings to remove the image (set to null to trigger deletion)
      const success = await updateSettings({ [settingKey]: null });
      
      if (success) {
        // Refetch settings to ensure we have the latest state
        await refetch();
        
        // Update local state after successful deletion
        const updated = { ...localSettings };
        delete updated[settingKey];
        setLocalSettings(updated);
        
        addToast(`${type} deleted successfully`, 'success');
      } else {
        addToast(`Failed to delete ${type}`, 'error');
      }
    } catch (err) {
      console.error('Error deleting image:', err);
      addToast(`Failed to delete ${type}`, 'error');
    }
  };


  const loadThemeLibrary = async () => {
    setThemesLoading(true);
    try {
      const data = await api.get<ThemeRecord[]>('/themes');
      setThemes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load theme library:', err);
      addToast('Failed to load theme library', 'error');
    } finally {
      setThemesLoading(false);
    }
  };

  const createManagedTheme = async () => {
    if (!localSettings) return;
    const name = prompt('Theme name'); // simple prompt
    if (!name) return;
    try {
      const payload = buildThemePayloadFromSettings(name, localSettings);
      await api.post('/themes', payload);
      addToast('Theme saved to library', 'success');
      loadThemeLibrary();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create theme', 'error');
    }
  };

  const activateTheme = async (id: string) => {
    await api.post(`/themes/${id}/publish`);
    addToast('Theme activated', 'success');
    loadThemeLibrary();
  };

  const scheduleTheme = async (id: string) => {
    const when = prompt('Schedule activation (ISO format, e.g., 2024-07-01T09:00:00Z)');
    if (!when) return;
    await api.post(`/themes/${id}/schedule`, { scheduledAt: when });
    addToast('Theme scheduled', 'success');
    loadThemeLibrary();
  };

  const handleEditTheme = (theme: ThemeRecord) => {
    setEditingTheme(theme);
    setEditForm({
      name: theme.name,
      description: theme.description || '',
    });
  };

  const handleUpdateTheme = async () => {
    if (!editingTheme) return;
    try {
      await api.patch(`/themes/${editingTheme._id}`, {
        name: editForm.name,
        description: editForm.description,
      });
      addToast('Theme updated successfully', 'success');
      setEditingTheme(null);
      loadThemeLibrary();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update theme', 'error');
    }
  };

  const handleDeleteTheme = async (id: string) => {
    if (!confirm('Are you sure you want to delete this theme? This action cannot be undone.')) {
      return;
    }
    try {
      await api.delete(`/themes/${id}`);
      addToast('Theme deleted successfully', 'success');
      loadThemeLibrary();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete theme', 'error');
    }
  };

  const importTheme = async () => {
    const json = prompt('Paste theme JSON');
    if (!json) return;
    try {
      const parsed = JSON.parse(json);
      await api.post('/themes/import', parsed);
      addToast('Theme imported', 'success');
      loadThemeLibrary();
    } catch (error) {
      addToast('Invalid theme JSON', 'error');
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
        <h1 className="text-3xl font-bold text-gray-900">Theme Manager</h1>
        <p className="text-gray-600 mt-2">Create multiple theme presets, schedule activations, and fine-tune colors.</p>
      </div>

      {/* Theme Library */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Theme Library</h2>
            <p className="text-sm text-gray-500">
              Manage all saved themes. Activate instantly or schedule a launch date.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={importTheme}>
              Import Theme JSON
            </Button>
            <Button type="button" onClick={createManagedTheme}>
              Save Current as Theme
            </Button>
          </div>
        </div>

        {themesLoading ? (
          <div className="text-gray-500">Loading themes…</div>
        ) : themes.length === 0 ? (
          <div className="text-gray-500">No themes saved yet. Use “Save Current as Theme” to get started.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {themes.map((theme) => (
                  <tr key={theme._id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{theme.name}</p>
                      <p className="text-xs text-gray-500">{theme.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      {theme.isActive ? (
                        <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">Active</span>
                      ) : theme.scheduledAt ? (
                        <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                          Scheduled {new Date(theme.scheduledAt).toLocaleString()}
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">Draft</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{new Date(theme.updatedAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <Button type="button" size="sm" variant="outline" onClick={() => activateTheme(theme._id)}>
                        Activate
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => scheduleTheme(theme._id)}>
                        Schedule
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditTheme(theme)}
                        className="inline-flex items-center gap-1"
                      >
                        <FiEdit2 className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteTheme(theme._id)}
                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 hover:border-red-300"
                      >
                        <FiTrash2 className="h-4 w-4" />
                        Delete
                      </Button>
                      <a
                        href={`/api/admin/themes/${theme._id}/export`}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Export
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

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

        {/* Images */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Website Images</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hero Image (Homepage Banner)</label>
              {localSettings['theme.heroImage'] && (
                <div className="relative mb-2">
                  <img
                    src={localSettings['theme.heroImage']}
                    alt="Hero"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteImage('heroImage')}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                    title="Delete hero image"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
              <input
                key="hero-image-input"
                id="hero-image-file-input"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload(file, 'heroImage');
                    // Reset input after selection
                    e.target.value = '';
                  }
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                disabled={uploading === 'heroImage'}
              />
              {uploading === 'heroImage' && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">About Page Image</label>
              {localSettings['theme.aboutImage'] && (
                <div className="relative mb-2">
                  <img
                    src={localSettings['theme.aboutImage']}
                    alt="About"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteImage('aboutImage')}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                    title="Delete about image"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
              <input
                key="about-image-input"
                id="about-image-file-input"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload(file, 'aboutImage');
                    // Reset input after selection
                    e.target.value = '';
                  }
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                disabled={uploading === 'aboutImage'}
              />
              {uploading === 'aboutImage' && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Footer Image</label>
              {localSettings['theme.footerImage'] && (
                <div className="relative mb-2">
                  <img
                    src={localSettings['theme.footerImage']}
                    alt="Footer"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteImage('footerImage')}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                    title="Delete footer image"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
              <input
                key="footer-image-input"
                id="footer-image-file-input"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload(file, 'footerImage');
                    // Reset input after selection
                    e.target.value = '';
                  }
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

      {/* Edit Theme Modal */}
      <Modal
        isOpen={editingTheme !== null}
        onClose={() => setEditingTheme(null)}
        title="Edit Theme"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="edit-theme-name" className="block text-sm font-medium text-gray-700 mb-2">
              Theme Name
            </label>
            <input
              id="edit-theme-name"
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter theme name"
            />
          </div>
          <div>
            <label htmlFor="edit-theme-description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="edit-theme-description"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              placeholder="Enter theme description"
            />
          </div>
          {editingTheme?.palette && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Color Palette Preview</p>
              <div className="flex gap-2">
                <div className="flex flex-col items-center">
                  <div
                    className="w-12 h-12 rounded border border-gray-300"
                    style={{ backgroundColor: editingTheme.palette.primary }}
                  ></div>
                  <span className="text-xs text-gray-600 mt-1">Primary</span>
                </div>
                <div className="flex flex-col items-center">
                  <div
                    className="w-12 h-12 rounded border border-gray-300"
                    style={{ backgroundColor: editingTheme.palette.secondary }}
                  ></div>
                  <span className="text-xs text-gray-600 mt-1">Secondary</span>
                </div>
                <div className="flex flex-col items-center">
                  <div
                    className="w-12 h-12 rounded border border-gray-300"
                    style={{ backgroundColor: editingTheme.palette.accent }}
                  ></div>
                  <span className="text-xs text-gray-600 mt-1">Accent</span>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setEditingTheme(null)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={handleUpdateTheme}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

function buildThemePayloadFromSettings(name: string, settings: Record<string, any>) {
  const palette = {
    primary: settings['theme.primary'] || '#DC2626',
    secondary: settings['theme.secondary'] || '#1F2937',
    accent: settings['theme.accent'] || '#F59E0B',
    background: settings['theme.background'] || '#FFFFFF',
    surface: '#FFFFFF',
    success: '#16A34A',
    warning: '#FBBF24',
    danger: '#DC2626',
    text: settings['theme.text'] || '#111827',
  };

  const radiusMap: Record<string, number> = { none: 0, sm: 2, md: 4, lg: 8, xl: 12 };
  const selectedRadius = radiusMap[settings['theme.borderRadius'] || 'md'] || 4;

  return {
    name,
    description: `Generated from current settings on ${new Date().toLocaleString()}`,
    palette,
    typography: {
      baseFont: settings['theme.fontFamily'] || 'Inter, sans-serif',
      headingFont: settings['theme.headingFont'] || 'Playfair Display, serif',
    },
    borderRadius: {
      sm: Math.max(0, selectedRadius - 2),
      md: selectedRadius,
      lg: selectedRadius + 4,
    },
    spacingScale: [4, 8, 12, 16, 24, 32],
    shadows: {
      sm: '0 1px 2px rgba(0,0,0,0.05)',
      md: '0 4px 6px rgba(0,0,0,0.07)',
      lg: '0 10px 15px rgba(0,0,0,0.1)',
    },
    images: {
      logo: settings['theme.logo'],
      favicon: settings['theme.favicon'],
      banners: [settings['theme.heroImage'], settings['theme.aboutImage'], settings['theme.footerImage']]
        .filter(Boolean)
        .map(String),
    },
    animation: {
      durationFast: 150,
      durationSlow: 450,
    },
    email: {
      background: '#ffffff',
      text: palette.text,
      buttonBackground: palette.primary,
      buttonText: '#ffffff',
    },
    scheduledAt: null,
  };
}

