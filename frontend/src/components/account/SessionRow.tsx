/**
 * Session Row Component
 * 
 * Displays user session/device information.
 */

import { Session } from '../../hooks/useSessions';
import { Button } from '../Button';

interface SessionRowProps {
  session: Session;
  onRevoke: (sessionId: string) => void;
  isRevoking?: boolean;
}

export function SessionRow({ session, onRevoke, isRevoking }: SessionRowProps) {
  const getDeviceInfo = () => {
    if (session.deviceInfo) {
      return session.deviceInfo;
    }
    if (session.userAgent) {
      // Simple user agent parsing
      if (session.userAgent.includes('Mobile')) {
        return 'Mobile Device';
      }
      if (session.userAgent.includes('Chrome')) {
        return 'Chrome Browser';
      }
      if (session.userAgent.includes('Firefox')) {
        return 'Firefox Browser';
      }
      if (session.userAgent.includes('Safari')) {
        return 'Safari Browser';
      }
    }
    return 'Unknown Device';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-medium text-gray-900">{getDeviceInfo()}</span>
            {session.isCurrent && (
              <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded">
                This Device
              </span>
            )}
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            {session.ipAddress && <div>IP: {session.ipAddress}</div>}
            <div>
              Last active:{' '}
              {new Date(session.lastActive).toLocaleString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <div>
              Created:{' '}
              {new Date(session.createdAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>
        </div>
        {!session.isCurrent && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRevoke(session._id)}
            disabled={isRevoking}
            className="text-red-600 hover:text-red-700"
          >
            Revoke
          </Button>
        )}
      </div>
    </div>
  );
}

