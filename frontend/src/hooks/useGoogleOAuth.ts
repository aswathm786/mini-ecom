/**
 * Hook to check if Google OAuth is enabled
 */

import { useState, useEffect } from 'react';
import { csrfFetch } from '../lib/csrfFetch';

interface GoogleOAuthStatus {
  enabled: boolean;
  clientId?: string | null;
}

export function useGoogleOAuth() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkGoogleOAuth = async () => {
      try {
        const response = await csrfFetch<GoogleOAuthStatus>('/api/settings/auth/google');
        if (response.ok && response.data) {
          setIsEnabled(response.data.enabled === true);
          setClientId(response.data.clientId || null);
        } else {
          console.error('Failed to get Google OAuth status:', response.error);
          setIsEnabled(false);
        }
      } catch (error) {
        console.error('Error checking Google OAuth status:', error);
        setIsEnabled(false);
      } finally {
        setLoading(false);
      }
    };

    checkGoogleOAuth();
  }, []);

  return { isEnabled, clientId, loading };
}

