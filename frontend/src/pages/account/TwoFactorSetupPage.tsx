/**
 * Two-Factor Authentication Setup Page
 * 
 * Allows users to enable/disable 2FA using TOTP authenticator apps.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/Button';
import { csrfFetch } from '../../lib/csrfFetch';

export function TwoFactorSetupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Setup state
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await csrfFetch('/api/auth/2fa/status');
      if (response.ok) {
        const payload: any = response.data ?? response;
        setIsEnabled(Boolean(payload.enabled));
      } else {
        throw new Error(response.error || 'Failed to load status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load 2FA status');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    setMessage('');
    try {
      const response = await csrfFetch('/api/auth/2fa/generate', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(response.error || 'Failed to generate 2FA secret');
      }
      const payload: any = response.data ?? response;
      if (!payload?.secret) {
        throw new Error('Failed to generate 2FA secret');
      }
      setSecret(payload.secret);
      setQrCodeUrl(payload.qrCodeUrl);
      setBackupCodes(payload.backupCodes || []);
      setMessage('Scan the QR code with your authenticator app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate 2FA');
    } finally {
      setGenerating(false);
    }
  };

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setError('');
    try {
      const response = await csrfFetch('/api/auth/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ code: verificationCode }),
      });
      if (!response.ok) {
        throw new Error(response.error || 'Invalid verification code');
      }
      setIsEnabled(true);
      setMessage('2FA enabled successfully! Please save your backup codes.');
      setVerificationCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable 2FA');
    } finally {
      setVerifying(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await csrfFetch('/api/auth/2fa/disable', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(response.error || 'Failed to disable 2FA');
      }
      setIsEnabled(false);
      setSecret('');
      setQrCodeUrl('');
      setBackupCodes([]);
      setMessage('2FA disabled successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !secret) {
    return <div className="p-4 text-gray-600">Loading 2FA settings...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow-md rounded-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Two-Factor Authentication</h1>

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

        {isEnabled ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 font-medium">2FA is enabled</p>
              <p className="text-sm text-green-700 mt-1">
                Your account is protected with two-factor authentication.
              </p>
            </div>

            {backupCodes.length > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-yellow-800 font-medium mb-2">Backup Codes</p>
                <p className="text-sm text-yellow-700 mb-3">
                  Save these codes in a safe place. You can use them to access your account if you
                  lose your authenticator device.
                </p>
                <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="p-2 bg-white border border-yellow-300 rounded">
                      {code}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button variant="danger" onClick={handleDisable} isLoading={loading}>
              Disable 2FA
            </Button>
          </div>
        ) : secret ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Step 1: Scan QR Code</h2>
              <p className="text-sm text-gray-600 mb-4">
                Open your authenticator app (Google Authenticator, Authy, etc.) and scan this QR
                code:
              </p>
              {qrCodeUrl && (
                <div className="flex justify-center p-4 bg-gray-50 rounded-lg">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`}
                    alt="2FA QR Code"
                    className="w-48 h-48"
                  />
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Or enter this secret manually: <code className="font-mono">{secret}</code>
              </p>
            </div>

            <form onSubmit={handleEnable} className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Step 2: Verify Code</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Enter the 6-digit code from your authenticator app to confirm setup:
                </p>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  maxLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-center text-2xl tracking-widest font-mono"
                  placeholder="000000"
                  autoFocus
                />
              </div>

              <Button type="submit" className="w-full" isLoading={verifying}>
                Enable 2FA
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSecret('');
                  setQrCodeUrl('');
                  setBackupCodes([]);
                  setVerificationCode('');
                  setError('');
                  setMessage('');
                }}
                className="w-full"
              >
                Cancel
              </Button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-blue-800 font-medium">2FA is disabled</p>
              <p className="text-sm text-blue-700 mt-1">
                Enable two-factor authentication to add an extra layer of security to your
                account.
              </p>
            </div>

            <Button onClick={handleGenerate} isLoading={generating}>
              Enable 2FA
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

