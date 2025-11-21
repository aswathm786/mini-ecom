/**
 * Theme Context
 * 
 * Provides theme settings to the entire application.
 * Loads theme settings from the API and applies them dynamically.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { csrfFetch } from '../lib/csrfFetch';

export interface ThemeSettings {
  'theme.primary'?: string;
  'theme.secondary'?: string;
  'theme.accent'?: string;
  'theme.background'?: string;
  'theme.text'?: string;
  'theme.textLight'?: string;
  'theme.logo'?: string;
  'theme.favicon'?: string;
  'theme.siteTagline'?: string;
  'site.name'?: string;
  'theme.heroImage'?: string;
  'theme.aboutImage'?: string;
  'theme.footerImage'?: string;
  'theme.headerStyle'?: 'default' | 'centered' | 'minimal';
  'theme.footerStyle'?: 'default' | 'minimal' | 'extended';
  'theme.layoutWidth'?: 'full' | 'container' | 'narrow';
  'theme.fontFamily'?: string;
  'theme.headingFont'?: string;
  'theme.borderRadius'?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  'theme.shadow'?: 'none' | 'sm' | 'md' | 'lg';
  'theme.animation'?: boolean;
  'store.name'?: string; // Include store name for display purposes
}

interface ThemeContextType {
  settings: ThemeSettings | null;
  loading: boolean;
  applyTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [storeSettingsName, setStoreSettingsName] = useState<string | null>(null);

  useEffect(() => {
    loadThemeSettings();
    loadStoreName();
    loadStoreSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      applyTheme();
    }
  }, [settings, storeName, storeSettingsName]);

  const loadThemeSettings = async () => {
    try {
      const response = await fetch('/api/theme-settings');
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.data) {
          const normalized = normalizeTheme(data.data);
          if (normalized) {
            setSettings(normalized);
            // Extract site.name or store.name if present in the response
            if (data.data['site.name']) {
              setStoreName(data.data['site.name']);
            } else if (data.data['store.name']) {
              setStoreName(data.data['store.name']);
            }
            return;
          }
        }
      }
    } catch (error) {
      console.error('Failed to load theme settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStoreName = async () => {
    // store.name is now included in theme-settings response from backend
    // No need to fetch separately
  };

  const loadStoreSettings = async () => {
    try {
      const response = await fetch('/api/store-settings');
      if (response.ok) {
        const data = await response.json();
        if (data && data.name) {
          setStoreSettingsName(data.name);
        }
      }
    } catch (error) {
      // Silently fail - store settings are optional
    }
  };

  const applyTheme = () => {
    if (!settings) return;

    const root = document.documentElement;
    
    // Apply CSS variables for colors
    if (settings['theme.primary']) {
      root.style.setProperty('--color-primary', settings['theme.primary']);
    }
    if (settings['theme.secondary']) {
      root.style.setProperty('--color-secondary', settings['theme.secondary']);
    }
    if (settings['theme.accent']) {
      root.style.setProperty('--color-accent', settings['theme.accent']);
    }
    if (settings['theme.background']) {
      root.style.setProperty('--color-background', settings['theme.background']);
    }
    if (settings['theme.text']) {
      root.style.setProperty('--color-text', settings['theme.text']);
    }
    if (settings['theme.textLight']) {
      root.style.setProperty('--color-text-light', settings['theme.textLight']);
    }

    // Apply favicon (will be overridden by store settings if available)
    if (settings['theme.favicon']) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = settings['theme.favicon'];
    }

    // Note: GlobalLayout handles setting document.title with store branding name
    // We don't set it here to avoid conflicts - GlobalLayout is the primary source

    // Apply layout classes
    const body = document.body;
    body.className = body.className.replace(/theme-\w+/g, ''); // Remove old theme classes
    
    if (settings['theme.headerStyle']) {
      body.classList.add(`theme-header-${settings['theme.headerStyle']}`);
    }
    if (settings['theme.footerStyle']) {
      body.classList.add(`theme-footer-${settings['theme.footerStyle']}`);
    }
    if (settings['theme.layoutWidth']) {
      body.classList.add(`theme-layout-${settings['theme.layoutWidth']}`);
    }
    if (settings['theme.borderRadius']) {
      body.classList.add(`theme-radius-${settings['theme.borderRadius']}`);
    }
    if (settings['theme.shadow']) {
      body.classList.add(`theme-shadow-${settings['theme.shadow']}`);
    }
    if (settings['theme.animation'] === false) {
      body.classList.add('theme-no-animation');
    }
  };

  return (
    <ThemeContext.Provider value={{ settings, loading, applyTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

function normalizeTheme(data: any): ThemeSettings | null {
  if (!data) return null;
  // Legacy map
  if (data['theme.primary']) {
    return data as ThemeSettings;
  }

  if (data.palette) {
    const settings: ThemeSettings = {
      'theme.primary': data.palette.primary,
      'theme.secondary': data.palette.secondary,
      'theme.accent': data.palette.accent,
      'theme.background': data.palette.background,
      'theme.text': data.palette.text,
      'site.name': data.name,
      'theme.logo': data.images?.logo,
      'theme.favicon': data.images?.favicon,
    };
    return settings;
  }

  return null;
}

