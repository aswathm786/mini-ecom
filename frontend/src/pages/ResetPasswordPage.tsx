/**
 * Reset Password Page
 * 
 * Allows users to reset their password using a token from the email link.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { csrfFetch } from '../lib/csrfFetch';
import { Button } from '../components/Button';
import { PasswordInput } from '../components/PasswordInput';

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const validateToken = async () => {
      const tokenFromUrl = searchParams.get('token');
      if (!tokenFromUrl) {
        setError('Invalid reset link. The reset link has expired.');
        setIsValidatingToken(false);
        return;
      }

      setToken(tokenFromUrl);
      setIsValidatingToken(true);

      try {
        const response = await fetch(`/api/auth/validate-reset-token?token=${encodeURIComponent(tokenFromUrl)}`);
        const data = await response.json();

        if (response.ok && data.ok) {
          setTokenValid(true);
        } else {
          // Use the error message from the backend, or default message
          setError(data.error || 'This reset link has expired.');
          setTokenValid(false);
        }
      } catch (err) {
        setError('Failed to validate reset token. Please try again.');
        setTokenValid(false);
      } finally {
        setIsValidatingToken(false);
      }
    };

    validateToken();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPasswordErrors([]);

    // Client-side validation
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!token) {
      setError('Invalid reset token. Please request a new password reset.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await csrfFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });

      if (response.ok) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login?passwordReset=true');
        }, 3000);
      } else {
        // Handle password validation errors
        if (response.data?.details && Array.isArray(response.data.details)) {
          const errors = response.data.details.map((detail: any) => detail.message || detail);
          setPasswordErrors(errors);
          setError('Password validation failed. Please check the requirements below.');
        } else {
          setError(response.error || 'Failed to reset password. Please try again.');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white shadow-md rounded-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Password Reset Successful
          </h1>
          <div className="p-4 bg-green-50 border border-green-200 rounded-md mb-6">
            <p className="text-green-800 text-sm">
              Your password has been successfully reset. You will be redirected to the login page shortly.
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            className="w-full"
            onClick={() => navigate('/login')}
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (isValidatingToken) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white shadow-md rounded-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Reset Password
          </h1>
          <div className="text-center">
            <p className="text-gray-600">Validating reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!token || !tokenValid) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white shadow-md rounded-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Reset Password
          </h1>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}
          <div className="text-center space-y-4">
            <div className="text-sm text-gray-600">
              <Link to="/login" className="text-primary-600 hover:text-primary-700">
                Return to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white shadow-md rounded-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Reset Password
        </h1>

        <p className="text-gray-600 mb-6 text-center">
          Enter your new password below.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        {passwordErrors.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-800 text-sm font-medium mb-2">Password requirements:</p>
            <ul className="list-disc list-inside text-yellow-700 text-sm space-y-1">
              {passwordErrors.map((err, index) => (
                <li key={index}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
            id="password"
            label="New Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your new password"
            helperText="Password must be at least 8 characters with uppercase, lowercase, number, and special character"
            error={passwordErrors.length > 0 && !password ? 'Password is required' : undefined}
          />

          <PasswordInput
            id="confirmPassword"
            label="Confirm New Password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your new password"
            error={
              confirmPassword && password !== confirmPassword
                ? 'Passwords do not match'
                : undefined
            }
          />

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Reset Password
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link to="/login" className="text-primary-600 hover:text-primary-700">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
