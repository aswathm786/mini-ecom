/**
 * Admin Users Hook
 * 
 * Manages user operations: list, view, update, revoke sessions.
 */

import { useState, useCallback, useEffect } from 'react';
import { useAdminApi } from './useAdminApi';

export interface User {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  permissions?: string[];
  status: 'active' | 'suspended' | 'deleted';
  createdAt: string;
  lastLogin?: string;
}

interface Session {
  _id: string;
  deviceInfo?: string;
  ipAddress?: string;
  lastActive: string;
}

interface UseUsersAdminParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}

interface UseUsersAdminResult {
  users: User[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
  setPage: (page: number) => void;
  setFilters: (filters: Partial<UseUsersAdminParams>) => void;
  getUser: (userId: string) => Promise<User | null>;
  getUserSessions: (userId: string) => Promise<Session[]>;
  updateUser: (userId: string, data: Partial<User>) => Promise<boolean>;
  revokeUserSession: (userId: string, sessionId: string) => Promise<boolean>;
  refetch: () => void;
}

export function useUsersAdmin(params: UseUsersAdminParams = {}): UseUsersAdminResult {
  const api = useAdminApi();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(params.page || 1);
  const [pages, setPages] = useState(0);
  const [filters, setFilters] = useState<Partial<UseUsersAdminParams>>(params);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams: Record<string, any> = {
        page: page.toString(),
        limit: (params.limit || 20).toString(),
      };
      if (filters.search) queryParams.search = filters.search;
      if (filters.role) queryParams.role = filters.role;
      if (filters.status) queryParams.status = filters.status;

      const data = await api.get<{ items: User[]; total: number; pages: number }>('/users', queryParams);
      setUsers(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [api, page, filters, params.limit]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const getUser = useCallback(async (userId: string): Promise<User | null> => {
    try {
      const user = await api.get<User>(`/users/${userId}`);
      return user;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user');
      return null;
    }
  }, [api]);

  const getUserSessions = useCallback(async (userId: string): Promise<Session[]> => {
    try {
      const sessions = await api.get<Session[]>(`/users/${userId}/sessions`);
      return sessions;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
      return [];
    }
  }, [api]);

  const updateUser = useCallback(async (userId: string, data: Partial<User>): Promise<boolean> => {
    try {
      await api.put(`/users/${userId}`, data);
      await fetchUsers();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
      return false;
    }
  }, [api, fetchUsers]);

  const revokeUserSession = useCallback(async (userId: string, sessionId: string): Promise<boolean> => {
    try {
      await api.post(`/users/${userId}/sessions/revoke`, { sessionId });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke session');
      return false;
    }
  }, [api]);

  return {
    users,
    loading,
    error,
    total,
    page,
    pages,
    setPage,
    setFilters,
    getUser,
    getUserSessions,
    updateUser,
    revokeUserSession,
    refetch: fetchUsers,
  };
}

