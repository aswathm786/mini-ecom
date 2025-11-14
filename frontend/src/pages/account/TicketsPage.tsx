/**
 * Tickets Page
 * 
 * List support tickets and create new ones.
 */

import { useState, useEffect } from 'react';
import { useTickets } from '../../hooks/useTickets';
import { TicketRow } from '../../components/account/TicketRow';
import { TicketCreateModal } from '../../components/modals/TicketCreateModal';
import { Button } from '../../components/Button';

export function TicketsPage() {
  const { tickets, loading, error, createTicket, refetch } = useTickets();
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleCreateTicket = async (data: { subject: string; message: string; attachments?: string[] }) => {
    try {
      await createTicket(data);
      setShowCreateModal(false);
      await refetch();
    } catch (error) {
      console.error('Error creating ticket:', error);
    }
  };

  if (loading && tickets.length === 0) {
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
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Support Tickets</h1>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          Create Ticket
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      {tickets.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <p className="text-gray-600 mb-4">You haven't created any support tickets yet.</p>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            Create Your First Ticket
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <TicketRow key={ticket._id} ticket={ticket} />
          ))}
        </div>
      )}

      <TicketCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateTicket}
      />
    </div>
  );
}

