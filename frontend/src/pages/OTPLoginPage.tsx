/**
 * OTP Login Page
 * 
 * Allows users to log in using a one-time password sent via email.
 */

import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { csrfFetch } from '../lib/csrfFetch';

export function OTPLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const { refreshUser } = useAuth();
  
  const [step, setStep] = useState<'request' | 'verify' | 'verify2FA'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const response = await csrfFetch('/api/auth/otp/request', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error(response.error || 'Failed to send OTP');
      }

      setMessage('OTP sent to your email. Please check your inbox.');
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await csrfFetch('/api/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      });

      // Check if 2FA is required
      if (response.ok && (response.requires2FA || response.data?.requires2FA)) {
        // 2FA is required - show 2FA input
        setStep('verify2FA');
        setMessage('Please enter your 2FA code');
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(response.error || 'Invalid OTP');
      }

      // OTP verified - wait for cookies to be set, then refresh user and navigate
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refresh user data from auth context
      await refreshUser(true);
      
      // Navigate to redirect URL
      navigate(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Send OTP code and 2FA code together
      const response = await csrfFetch('/api/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ email, code, twoFACode }),
      });

      if (!response.ok) {
        throw new Error(response.error || 'Invalid 2FA code');
      }

      // 2FA verified - wait for cookies to be set, then refresh user and navigate
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refresh user data from auth context
      await refreshUser(true);
      
      // Navigate to redirect URL
      navigate(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid 2FA code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white shadow-md rounded-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Login with OTP
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
            {message}
          </div>
        )}

        {step === 'request' ? (
          <form onSubmit={handleRequestOTP} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="your@email.com"
              />
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Send OTP
            </Button>

            <div className="text-center text-sm">
              <Link to="/login" className="text-primary-600 hover:text-primary-700">
                Back to password login
              </Link>
            </div>
          </form>
        ) : step === 'verify' ? (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                Enter 6-digit OTP
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-center text-2xl tracking-widest font-mono"
                placeholder="000000"
                autoFocus
              />
              <p className="mt-2 text-sm text-gray-500">
                Check your email for the OTP code. It expires in 10 minutes.
              </p>
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Verify OTP
            </Button>

            <div className="text-center text-sm space-y-2">
              <button
                type="button"
                onClick={() => {
                  setStep('request');
                  setCode('');
                  setError('');
                  setMessage('');
                }}
                className="text-primary-600 hover:text-primary-700"
              >
                Use different email
              </button>
              <div>
                <Link to="/login" className="text-gray-600 hover:text-gray-700">
                  Back to password login
                </Link>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerify2FA} className="space-y-4">
            <div>
              <label htmlFor="twoFACode" className="block text-sm font-medium text-gray-700 mb-1">
                Enter 2FA Code
              </label>
              <input
                id="twoFACode"
                type="text"
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-center text-2xl tracking-widest font-mono"
                placeholder="000000"
                autoFocus
              />
              <p className="mt-2 text-sm text-gray-500">
                Enter the 6-digit code from your authenticator app.
              </p>
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Verify 2FA
            </Button>

            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => {
                  setStep('verify');
                  setTwoFACode('');
                  setError('');
                }}
                className="text-primary-600 hover:text-primary-700"
              >
                Back to OTP
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

