/**
 * useSessions Hook
 * 
 * Manages user sessions: list, revoke.
 */

import { useState, useCallback } from 'react';
import { csrfFetch } from '../lib/csrfFetch';

export interface Session {
  _id: string;
  deviceId?: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  lastActive: string;
  createdAt: string;
  isCurrent?: boolean;
}

interface UseSessionsResult {
  sessions: Session[];
  loading: boolean;
  error: string | null;
  revokeSession: (sessionId: string) => Promise<boolean>;
  refetch: () => void;
}

export function useSessions(): UseSessionsResult {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await csrfFetch('/api/me/sessions');
      if (response.ok && response.data) {
        setSessions(Array.isArray(response.data) ? response.data : []);
      } else {
        setError(response.error || 'Failed to fetch sessions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  const revokeSession = useCallback(async (sessionId: string): Promise<boolean> => {
    setError(null);
    try {
      const response = await csrfFetch(`/api/me/sessions/${sessionId}/revoke`, {
        method: 'POST',
      });

      if (response.ok) {
        setSessions((prev) => prev.filter((session) => session._id !== sessionId));
        return true;
      } else {
        throw new Error(response.error || 'Failed to revoke session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke session');
      throw err;
    }
  }, []);

  return {
    sessions,
    loading,
    error,
    revokeSession,
    refetch: fetchSessions,
  };
}

