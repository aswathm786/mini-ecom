/**
 * Profile Page
 * 
 * User profile management: edit name, email, phone, enable/disable 2FA.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { csrfFetch } from '../../lib/csrfFetch';
import { Button } from '../../components/Button';
import { validateEmail, validatePhone } from '../../lib/validators';
import { ToastContainer } from '../../components/Toast';

interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  twoFactorEnabled?: boolean;
  lastLogin?: {
    timestamp: string;
    ipAddress?: string;
    device?: string;
  };
}

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }>>([]);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [twoFASecret, setTwoFASecret] = useState<{ secret: string; qrcode: string } | null>(null);
  const [twoFACode, setTwoFACode] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const response = await csrfFetch('/api/me');
      if (response.ok && response.data) {
        setProfile(response.data.user || response.data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const newErrors: Record<string, string> = {};

    if (profile.phone && !validatePhone(profile.phone)) {
      newErrors.phone = 'Invalid phone number';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      const response = await csrfFetch('/api/me', {
        method: 'PUT',
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone,
        }),
      });

      if (response.ok) {
        addToast('Profile updated successfully', 'success');
        await refreshUser();
      } else {
        throw new Error(response.error || 'Failed to update profile');
      }
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEmailChange = async () => {
    if (!profile || !validateEmail(profile.email)) {
      setErrors({ email: 'Invalid email address' });
      return;
    }

    try {
      const response = await csrfFetch('/api/me/email-change', {
        method: 'POST',
        body: JSON.stringify({ email: profile.email }),
      });

      if (response.ok) {
        addToast('Verification email sent. Please check your inbox.', 'success');
      } else {
        throw new Error(response.error || 'Failed to request email change');
      }
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to request email change', 'error');
    }
  };

  const handleEnable2FA = async () => {
    try {
      const response = await csrfFetch('/api/me/enable-2fa', {
        method: 'POST',
      });

      if (response.ok && response.data) {
        setTwoFASecret({
          secret: response.data.secret,
          qrcode: response.data.qrcode_svg || '',
        });
        setShow2FASetup(true);
      } else {
        throw new Error(response.error || 'Failed to enable 2FA');
      }
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to enable 2FA', 'error');
    }
  };

  const handleVerify2FA = async () => {
    if (!twoFACode || twoFACode.length !== 6) {
      addToast('Please enter a valid 6-digit code', 'error');
      return;
    }

    try {
      const response = await csrfFetch('/api/me/verify-2fa', {
        method: 'POST',
        body: JSON.stringify({ code: twoFACode }),
      });

      if (response.ok) {
        addToast('2FA enabled successfully', 'success');
        setShow2FASetup(false);
        setTwoFACode('');
        setTwoFASecret(null);
        await loadProfile();
      } else {
        throw new Error(response.error || 'Invalid verification code');
      }
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Invalid verification code', 'error');
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm('Are you sure you want to disable 2FA? This will reduce your account security.')) {
      return;
    }

    try {
      const response = await csrfFetch('/api/me/disable-2fa', {
        method: 'POST',
      });

      if (response.ok) {
        addToast('2FA disabled successfully', 'success');
        await loadProfile();
      } else {
        throw new Error(response.error || 'Failed to disable 2FA');
      }
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to disable 2FA', 'error');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-gray-600">Failed to load profile</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile Settings</h1>

      {/* Last Login Info */}
      {profile.lastLogin && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Last Login</h3>
          <div className="text-sm text-blue-700">
            <p>
              {new Date(profile.lastLogin.timestamp).toLocaleString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            {profile.lastLogin.ipAddress && <p>IP: {profile.lastLogin.ipAddress}</p>}
            {profile.lastLogin.device && <p>Device: {profile.lastLogin.device}</p>}
          </div>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleUpdateProfile} className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Personal Information</h2>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                value={profile.firstName || ''}
                onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.firstName ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                value={profile.lastName || ''}
                onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.lastName ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="flex gap-2">
              <input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleEmailChange}
              >
                Change Email
              </Button>
            </div>
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            <p className="mt-1 text-xs text-gray-500">
              A verification email will be sent to confirm the new address
            </p>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              value={profile.phone || ''}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                errors.phone ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="10-digit phone number"
            />
            {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
          </div>

          <div className="pt-4">
            <Button type="submit" variant="primary" isLoading={saving}>
              Save Changes
            </Button>
          </div>
        </div>
      </form>

      {/* Two-Factor Authentication */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Security</h2>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Two-Factor Authentication</h3>
            <p className="text-sm text-gray-600 mt-1">
              {profile.twoFactorEnabled
                ? '2FA is enabled. Your account is more secure.'
                : 'Add an extra layer of security to your account'}
            </p>
          </div>
          {profile.twoFactorEnabled ? (
            <Button variant="outline" onClick={handleDisable2FA}>
              Disable 2FA
            </Button>
          ) : (
            <Button variant="primary" onClick={handleEnable2FA}>
              Enable 2FA
            </Button>
          )}
        </div>

        {/* 2FA Setup Modal */}
        {show2FASetup && twoFASecret && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-4">Setup Two-Factor Authentication</h4>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
                </p>
                {twoFASecret.qrcode && (
                  <div
                    className="inline-block p-2 bg-white rounded"
                    dangerouslySetInnerHTML={{ __html: twoFASecret.qrcode }}
                  />
                )}
                {!twoFASecret.qrcode && (
                  <div className="p-4 bg-white rounded text-sm text-gray-600">
                    Secret: <code className="font-mono">{twoFASecret.secret}</code>
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="2fa-code" className="block text-sm font-medium text-gray-700 mb-1">
                  Enter 6-digit code from your app
                </label>
                <div className="flex gap-2">
                  <input
                    id="2fa-code"
                    type="text"
                    maxLength={6}
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="000000"
                  />
                  <Button variant="primary" onClick={handleVerify2FA}>
                    Verify
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setShow2FASetup(false);
                    setTwoFACode('');
                    setTwoFASecret(null);
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

