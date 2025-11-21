/**
 * Profile Page
 * 
 * User profile management: edit name, email, phone, enable/disable 2FA.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { csrfFetch } from '../../lib/csrfFetch';
import { Button } from '../../components/Button';
import { PasswordInput } from '../../components/PasswordInput';
import { validateEmail, validatePhone } from '../../lib/validators';
import { ToastContainer } from '../../components/Toast';

interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
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
  const [twoFASecret, setTwoFASecret] = useState<{ secret: string; qrCodeUrl?: string; inlineSvg?: string } | null>(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changePasswordData, setChangePasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

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
      const response = await csrfFetch('/api/auth/2fa/generate', {
        method: 'POST',
      });

      if (response.ok) {
        const payload: any = response.data ?? response;
        if (!payload?.secret) {
          throw new Error('Failed to generate 2FA secret');
        }
        setTwoFASecret({
          secret: payload.secret,
          qrCodeUrl: payload.qrCodeUrl,
          inlineSvg: payload.qrcode_svg,
        });
        setShow2FASetup(true);
      } else {
        throw new Error(response.error || 'Failed to generate 2FA secret');
      }
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to generate 2FA secret', 'error');
    }
  };

  const handleVerify2FA = async () => {
    if (!twoFACode || twoFACode.length !== 6) {
      addToast('Please enter a valid 6-digit code', 'error');
      return;
    }

    try {
      const response = await csrfFetch('/api/auth/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ code: twoFACode }),
      });

      if (response.ok) {
        addToast('2FA enabled successfully', 'success');
        setShow2FASetup(false);
        setTwoFACode('');
        setTwoFASecret(null);
        // Reload profile and refresh user context
        await loadProfile();
        await refreshUser();
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
      const response = await csrfFetch('/api/auth/2fa/disable', {
        method: 'POST',
      });

      if (response.ok) {
        addToast('2FA disabled successfully', 'success');
        await loadProfile();
        await refreshUser();
      } else {
        throw new Error(response.error || 'Failed to disable 2FA');
      }
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to disable 2FA', 'error');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    if (!changePasswordData.currentPassword) {
      addToast('Current password is required', 'error');
      return;
    }
    
    if (!changePasswordData.newPassword) {
      addToast('New password is required', 'error');
      return;
    }
    
    if (changePasswordData.newPassword !== changePasswordData.confirmPassword) {
      addToast('New passwords do not match', 'error');
      return;
    }
    
    if (changePasswordData.newPassword.length < 8) {
      addToast('New password must be at least 8 characters', 'error');
      return;
    }

    setChangingPassword(true);
    setErrors({});

    try {
      const response = await csrfFetch('/api/me/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: changePasswordData.currentPassword,
          newPassword: changePasswordData.newPassword,
        }),
      });

      if (response.ok) {
        addToast('Password changed successfully', 'success');
        setChangePasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setShowChangePassword(false);
      } else {
        const errorMessage = response.error || response.details?.[0]?.message || 'Failed to change password';
        addToast(errorMessage, 'error');
        if (response.details && Array.isArray(response.details)) {
          const newErrors: Record<string, string> = {};
          response.details.forEach((detail: any) => {
            if (detail.message) {
              newErrors.password = detail.message;
            }
          });
          setErrors(newErrors);
        }
      }
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to change password', 'error');
    } finally {
      setChangingPassword(false);
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

      {/* Roles & Permissions Info */}
      {/* Only show to non-customer users (admin, root, administrator, etc.) */}
      {((profile.roles?.length > 0 || profile.permissions?.length > 0) && 
        !(profile.roles?.length === 1 && profile.roles[0] === 'customer')) && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
          <h3 className="text-sm font-medium text-green-800 mb-3">Roles & Permissions</h3>
          <div className="text-sm text-green-700 space-y-2">
            {profile.roles && profile.roles.length > 0 && (
              <div>
                <p className="font-medium mb-1">Roles:</p>
                <div className="flex flex-wrap gap-2">
                  {profile.roles.map((role, idx) => (
                    <span key={idx} className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {profile.permissions && profile.permissions.length > 0 && (
              <div>
                <p className="font-medium mb-1">Permissions ({profile.permissions.length}):</p>
                <div className="flex flex-wrap gap-2">
                  {profile.permissions.slice(0, 10).map((perm, idx) => (
                    <span key={idx} className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                      {perm}
                    </span>
                  ))}
                  {profile.permissions.length > 10 && (
                    <span className="inline-block text-green-600 px-2 py-1 text-xs">
                      +{profile.permissions.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            )}
            <p className="text-xs text-green-600 mt-2">
              If your roles or permissions were recently updated, please log out and log back in to refresh your access.
            </p>
          </div>
        </div>
      )}

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
                {twoFASecret.inlineSvg ? (
                  <div
                    className="inline-block p-2 bg-white rounded"
                    dangerouslySetInnerHTML={{ __html: twoFASecret.inlineSvg }}
                  />
                ) : twoFASecret.qrCodeUrl ? (
                  <div className="inline-block p-2 bg-white rounded">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                        twoFASecret.qrCodeUrl
                      )}`}
                      alt="2FA QR code"
                      className="w-48 h-48"
                    />
                  </div>
                ) : (
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

        {/* Change Password */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium text-gray-900">Change Password</h3>
              <p className="text-sm text-gray-600 mt-1">
                Update your account password
              </p>
            </div>
            {!showChangePassword && (
              <Button variant="outline" onClick={() => setShowChangePassword(true)}>
                Change Password
              </Button>
            )}
          </div>

          {showChangePassword && (
            <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
              <PasswordInput
                id="currentPassword"
                label="Current Password"
                value={changePasswordData.currentPassword}
                onChange={(e) => setChangePasswordData({ ...changePasswordData, currentPassword: e.target.value })}
                error={errors.currentPassword}
                required
              />

              <PasswordInput
                id="newPassword"
                label="New Password"
                value={changePasswordData.newPassword}
                onChange={(e) => setChangePasswordData({ ...changePasswordData, newPassword: e.target.value })}
                error={errors.newPassword || errors.password}
                helperText="Password must meet the configured password policy requirements"
                required
              />

              <PasswordInput
                id="confirmPassword"
                label="Confirm New Password"
                value={changePasswordData.confirmPassword}
                onChange={(e) => setChangePasswordData({ ...changePasswordData, confirmPassword: e.target.value })}
                error={errors.confirmPassword}
                required
              />

              <div className="flex gap-2">
                <Button type="submit" variant="primary" isLoading={changingPassword}>
                  Update Password
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowChangePassword(false);
                    setChangePasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: '',
                    });
                    setErrors({});
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

