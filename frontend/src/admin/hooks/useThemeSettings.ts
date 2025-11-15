/**
 * Theme Settings Hook
 * 
 * Manages theme and design customization settings.
 */

import { useState, useCallback, useEffect } from 'react';
import { useAdminApi } from './useAdminApi';

export interface ThemeSettings {
  // Color palette
  'theme.primary'?: string;
  'theme.secondary'?: string;
  'theme.accent'?: string;
  'theme.background'?: string;
  'theme.text'?: string;
  'theme.textLight'?: string;
  
  // Branding
  'theme.logo'?: string;
  'theme.favicon'?: string;
  'theme.siteName'?: string;
  'theme.siteTagline'?: string;
  
  // Images
  'theme.heroImage'?: string;
  'theme.aboutImage'?: string;
  'theme.footerImage'?: string;
  
  // Layout
  'theme.headerStyle'?: 'default' | 'centered' | 'minimal';
  'theme.footerStyle'?: 'default' | 'minimal' | 'extended';
  'theme.layoutWidth'?: 'full' | 'container' | 'narrow';
  
  // Typography
  'theme.fontFamily'?: string;
  'theme.headingFont'?: string;
  
  // Other design settings
  'theme.borderRadius'?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  'theme.shadow'?: 'none' | 'sm' | 'md' | 'lg';
  'theme.animation'?: boolean;
}

interface UseThemeSettingsResult {
  settings: ThemeSettings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (updates: Partial<ThemeSettings>) => Promise<boolean>;
  uploadLogo: (file: File) => Promise<string | null>;
  uploadImage: (file: File, imageType: string) => Promise<string | null>;
  refetch: () => void;
}

export function useThemeSettings(): UseThemeSettingsResult {
  const api = useAdminApi();
  const [settings, setSettings] = useState<ThemeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.get<ThemeSettings>('/theme-settings');
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch theme settings');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (updates: Partial<ThemeSettings>): Promise<boolean> => {
    try {
      await api.put('/theme-settings', updates);
      setSettings((prev) => ({ ...prev, ...updates }));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update theme settings');
      return false;
    }
  }, [api]);

  const uploadLogo = useCallback(async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('logo', file);
      
      const response = await api.postForm<{ logo: string }>('/theme-settings/upload-logo', formData);
      if (response.logo) {
        setSettings((prev) => ({ ...prev, 'theme.logo': response.logo }));
        return response.logo;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload logo');
      return null;
    }
  }, [api]);

  const uploadImage = useCallback(async (file: File, imageType: string): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('imageType', imageType);
      
      const response = await api.postForm<Record<string, string>>('/theme-settings/upload-image', formData);
      const imageUrl = response[imageType];
      if (imageUrl) {
        const settingKey = `theme.${imageType}` as keyof ThemeSettings;
        setSettings((prev) => ({ ...prev, [settingKey]: imageUrl }));
        return imageUrl;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
      return null;
    }
  }, [api]);

  return {
    settings,
    loading,
    error,
    updateSettings,
    uploadLogo,
    uploadImage,
    refetch: fetchSettings,
  };
}

