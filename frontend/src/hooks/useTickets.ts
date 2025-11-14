/**
 * useTickets Hook
 * 
 * Manages support tickets: create, list, view, reply, close.
 */

import { useState, useCallback } from 'react';
import { csrfFetch } from '../lib/csrfFetch';

export interface TicketMessage {
  _id: string;
  userId: string;
  message: string;
  attachments?: Array<{ filename: string; url: string }>;
  createdAt: string;
  isAgent?: boolean;
}

export interface Ticket {
  _id: string;
  userId: string;
  orderId?: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

interface UseTicketsResult {
  tickets: Ticket[];
  loading: boolean;
  error: string | null;
  createTicket: (data: CreateTicketData) => Promise<Ticket | null>;
  getTicket: (id: string) => Promise<Ticket | null>;
  replyToTicket: (id: string, message: string, attachments?: string[]) => Promise<boolean>;
  closeTicket: (id: string) => Promise<boolean>;
  refetch: () => void;
}

interface CreateTicketData {
  orderId?: string;
  subject: string;
  message: string;
  attachments?: string[];
}

export function useTickets(): UseTicketsResult {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await csrfFetch('/api/tickets');
      if (response.ok && response.data) {
        setTickets(Array.isArray(response.data) ? response.data : response.data.items || []);
      } else {
        setError(response.error || 'Failed to fetch tickets');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  const createTicket = useCallback(async (data: CreateTicketData): Promise<Ticket | null> => {
    setError(null);
    try {
      const response = await csrfFetch('/api/tickets', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (response.ok && response.data) {
        const newTicket = response.data as Ticket;
        setTickets((prev) => [newTicket, ...prev]);
        return newTicket;
      } else {
        throw new Error(response.error || 'Failed to create ticket');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
      throw err;
    }
  }, []);

  const getTicket = useCallback(async (id: string): Promise<Ticket | null> => {
    setError(null);
    try {
      const response = await csrfFetch(`/api/tickets/${id}`);
      if (response.ok && response.data) {
        return response.data as Ticket;
      } else {
        setError(response.error || 'Ticket not found');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      return null;
    }
  }, []);

  const replyToTicket = useCallback(
    async (id: string, message: string, attachments?: string[]): Promise<boolean> => {
      setError(null);
      try {
        const response = await csrfFetch(`/api/tickets/${id}/reply`, {
          method: 'POST',
          body: JSON.stringify({ message, attachments }),
        });

        if (response.ok) {
          return true;
        } else {
          throw new Error(response.error || 'Failed to send reply');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send reply');
        throw err;
      }
    },
    []
  );

  const closeTicket = useCallback(async (id: string): Promise<boolean> => {
    setError(null);
    try {
      const response = await csrfFetch(`/api/tickets/${id}/close`, {
        method: 'POST',
      });

      if (response.ok) {
        setTickets((prev) =>
          prev.map((ticket) =>
            ticket._id === id ? { ...ticket, status: 'closed' } : ticket
          )
        );
        return true;
      } else {
        throw new Error(response.error || 'Failed to close ticket');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close ticket');
      throw err;
    }
  }, []);

  return {
    tickets,
    loading,
    error,
    createTicket,
    getTicket,
    replyToTicket,
    closeTicket,
    refetch: fetchTickets,
  };
}

