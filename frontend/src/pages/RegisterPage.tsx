/**
 * Register Page
 * 
 * User registration form placeholder - will be fleshed out in later parts.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { PasswordInput } from '../components/PasswordInput';
import { useGoogleOAuth } from '../hooks/useGoogleOAuth';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [requiresGoogle2FA, setRequiresGoogle2FA] = useState(false);
  const [googleTwoFACode, setGoogleTwoFACode] = useState('');
  const [pendingGoogleCredential, setPendingGoogleCredential] = useState<string | null>(null);
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const { isEnabled: isGoogleOAuthEnabled, clientId: googleClientIdFromApi, loading: googleOAuthLoading } = useGoogleOAuth();
  
  // Use client ID from API if available, otherwise fall back to env var
  const effectiveGoogleClientId = googleClientIdFromApi || GOOGLE_CLIENT_ID;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await register(formData);
      navigate('/login?registered=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  useEffect(() => {
    // Only load Google script if OAuth is enabled
    if (!isGoogleOAuthEnabled || googleOAuthLoading) {
      return;
    }

    if (!effectiveGoogleClientId) {
      console.warn('Google OAuth is enabled but Client ID is not configured');
      return;
    }

    if (window.google) {
      setGoogleReady(true);
      return;
    }

    const existingScript = document.getElementById('google-login-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => setGoogleReady(true), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.id = 'google-login-script';
    script.onload = () => setGoogleReady(true);
    document.body.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, [isGoogleOAuthEnabled, googleOAuthLoading, effectiveGoogleClientId]);

  useEffect(() => {
    if (!isGoogleOAuthEnabled || !effectiveGoogleClientId || !googleReady || !window.google || !googleButtonRef.current) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: effectiveGoogleClientId,
      callback: async ({ credential }) => {
        if (!credential) {
          setError('Google login failed. Please try again.');
          return;
        }
        try {
          setIsLoading(true);
          setError('');
          setPendingGoogleCredential(credential);
          await loginWithGoogle(credential, rememberMe);
          setPendingGoogleCredential(null);
          navigate('/');
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Google login failed';
          
          // Check if 2FA is required for Google OAuth
          if (errorMessage.includes('Please enter')) {
            setRequiresGoogle2FA(true);
            setError(''); // Clear error for 2FA prompt
          } else {
            setError(errorMessage);
            setPendingGoogleCredential(null);
          }
        } finally {
          setIsLoading(false);
        }
      },
    });

    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: 'outline',
      size: 'large',
      width: 300, // Use number instead of percentage
      text: 'continue_with',
    });
  }, [isGoogleOAuthEnabled, effectiveGoogleClientId, googleReady, loginWithGoogle, navigate, rememberMe]);

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white shadow-md rounded-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Create Account
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              value={formData.firstName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              value={formData.lastName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="your@email.com"
            />
          </div>

          <PasswordInput
            id="password"
            name="password"
            label="Password"
            required
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
          />

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Create Account
          </Button>
        </form>

        {isGoogleOAuthEnabled && !googleOAuthLoading && effectiveGoogleClientId && (
          <>
            <div className="flex items-center my-6">
              <div className="flex-grow border-t border-gray-200" />
              <span className="px-3 text-xs uppercase tracking-wide text-gray-500">Or</span>
              <div className="flex-grow border-t border-gray-200" />
            </div>
            {requiresGoogle2FA ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="google-2fa-code" className="block text-sm font-medium text-gray-700 mb-1">
                    Two-Factor Authentication Code
                  </label>
                  <input
                    id="google-2fa-code"
                    type="text"
                    required
                    value={googleTwoFACode}
                    onChange={(e) => setGoogleTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-center text-2xl tracking-widest font-mono"
                    placeholder="000000"
                    autoFocus
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>
                <Button
                  type="button"
                  className="w-full"
                  isLoading={isLoading}
                  onClick={async () => {
                    if (!pendingGoogleCredential) return;
                    try {
                      setIsLoading(true);
                      setError('');
                      await loginWithGoogle(pendingGoogleCredential, rememberMe, googleTwoFACode);
                      setPendingGoogleCredential(null);
                      setRequiresGoogle2FA(false);
                      navigate('/');
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Google login failed');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                >
                  Verify Code
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setRequiresGoogle2FA(false);
                    setGoogleTwoFACode('');
                    setPendingGoogleCredential(null);
                    setError('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div ref={googleButtonRef} className="flex justify-center w-full" />
            )}
          </>
        )}

        <div className="mt-4 flex items-center justify-center">
          <input
            id="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
            Remember me
          </label>
        </div>

        <div className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <a href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
