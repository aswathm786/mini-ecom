/**
 * Sessions Page
 * 
 * List and manage user sessions/devices.
 */

import { useEffect, useState } from 'react';
import { useSessions } from '../../hooks/useSessions';
import { SessionRow } from '../../components/account/SessionRow';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { ToastContainer } from '../../components/Toast';

export function SessionsPage() {
  const { sessions, loading, error, revokeSession, refetch } = useSessions();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }>>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleRevoke = (sessionId: string) => {
    setRevokingId(sessionId);
    setShowRevokeConfirm(true);
  };

  const confirmRevoke = async () => {
    if (revokingId) {
      try {
        await revokeSession(revokingId);
        addToast('Session revoked successfully', 'success');
        setShowRevokeConfirm(false);
        setRevokingId(null);
        await refetch();
      } catch (error) {
        addToast('Failed to revoke session', 'error');
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="space-y-3">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Active Sessions</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
        <p className="text-sm text-blue-700">
          <strong>Security Tip:</strong> If you notice any unfamiliar sessions, revoke them immediately to protect your account.
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <p className="text-gray-600">No active sessions found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <SessionRow
              key={session._id}
              session={session}
              onRevoke={handleRevoke}
              isRevoking={revokingId === session._id}
            />
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={showRevokeConfirm}
        title="Revoke Session"
        message="Are you sure you want to revoke this session? The user will be logged out from this device."
        confirmText="Revoke"
        cancelText="Cancel"
        variant="warning"
        onConfirm={confirmRevoke}
        onCancel={() => {
          setShowRevokeConfirm(false);
          setRevokingId(null);
        }}
      />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

