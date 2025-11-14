/**
 * Admin User Show Page
 * 
 * User details, sessions, roles assignment, order history.
 */

import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useUsersAdmin } from '../hooks/useUsersAdmin';
import { ConfirmAction } from '../components/ConfirmAction';
import { Button } from '../../components/Button';
import { ToastContainer } from '../../components/Toast';

export function UserShowPage() {
  const { id } = useParams<{ id: string }>();
  const { getUser, getUserSessions, updateUser, revokeUserSession } = useUsersAdmin({});
  const [user, setUser] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }>>([]);

  useEffect(() => {
    if (id) {
      loadUser();
      loadSessions();
    }
  }, [id]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const toastId = Date.now().toString();
    setToasts((prev) => [...prev, { id: toastId, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const loadUser = async () => {
    setLoading(true);
    try {
      const userData = await getUser(id!);
      setUser(userData);
    } catch (err) {
      addToast('Failed to load user', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const sessionsData = await getUserSessions(id!);
      setSessions(sessionsData);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };

  const handleRevokeSession = (sessionId: string) => {
    setRevokingSessionId(sessionId);
    setShowRevokeConfirm(true);
  };

  const confirmRevokeSession = async () => {
    if (revokingSessionId && id) {
      const success = await revokeUserSession(id, revokingSessionId);
      if (success) {
        addToast('Session revoked successfully', 'success');
        await loadSessions();
      } else {
        addToast('Failed to revoke session', 'error');
      }
      setRevokingSessionId(null);
      setShowRevokeConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <Link to="/admin/users" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
          ← Back to Users
        </Link>
        <p className="text-gray-600">User not found</p>
      </div>
    );
  }

  return (
    <div>
      <Link to="/admin/users" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
        ← Back to Users
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-8">User Details</h1>

      {/* User Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">User Information</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Name</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : 'N/A'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Roles</dt>
            <dd className="mt-1">
              <div className="flex gap-1">
                {user.roles?.map((role: string) => (
                  <span key={role} className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded">
                    {role}
                  </span>
                ))}
              </div>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1 text-sm text-gray-900 capitalize">{user.status}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Created At</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(user.createdAt).toLocaleString('en-IN')}
            </dd>
          </div>
          {user.lastLogin && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Login</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(user.lastLogin).toLocaleString('en-IN')}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Sessions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Sessions</h2>
        {sessions.length === 0 ? (
          <p className="text-gray-600">No active sessions</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session._id} className="flex items-center justify-between border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {session.deviceInfo || 'Unknown Device'}
                  </p>
                  <p className="text-xs text-gray-600">
                    IP: {session.ipAddress || 'N/A'} • Last active: {new Date(session.lastActive).toLocaleString('en-IN')}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRevokeSession(session._id)}
                  className="text-red-600 hover:text-red-700"
                >
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order History Link */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Order History</h2>
        <Link
          to={`/admin/orders?userId=${user._id}`}
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          View all orders for this user →
        </Link>
      </div>

      <ConfirmAction
        isOpen={showRevokeConfirm}
        title="Revoke Session"
        message="Are you sure you want to revoke this session? The user will be logged out from this device."
        confirmText="Revoke"
        onConfirm={confirmRevokeSession}
        onCancel={() => {
          setShowRevokeConfirm(false);
          setRevokingSessionId(null);
        }}
        variant="warning"
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

