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
  'theme.siteName'?: string;
  'theme.siteTagline'?: string;
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
}

interface ThemeContextType {
  settings: ThemeSettings | null;
  loading: boolean;
  applyTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadThemeSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      applyTheme();
    }
  }, [settings]);

  const loadThemeSettings = async () => {
    try {
      // Try to get from public API (no auth required for theme settings)
      const response = await fetch('/api/theme-settings');
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.data) {
          setSettings(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to load theme settings:', error);
    } finally {
      setLoading(false);
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

    // Apply favicon
    if (settings['theme.favicon']) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = settings['theme.favicon'];
    }

    // Apply site name
    if (settings['theme.siteName']) {
      document.title = settings['theme.siteName'];
    }

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

