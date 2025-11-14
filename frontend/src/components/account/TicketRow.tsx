/**
 * Ticket Row Component
 * 
 * Displays support ticket in a list row format.
 */

import { Link } from 'react-router-dom';
import { Ticket } from '../../hooks/useTickets';

interface TicketRowProps {
  ticket: Ticket;
}

export function TicketRow({ ticket }: TicketRowProps) {
  const statusColors = {
    open: 'bg-green-100 text-green-800',
    in_progress: 'bg-blue-100 text-blue-800',
    resolved: 'bg-gray-100 text-gray-800',
    closed: 'bg-red-100 text-red-800',
  };

  return (
    <Link
      to={`/account/tickets/${ticket._id}`}
      className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-medium text-gray-900">{ticket.subject}</span>
            <span
              className={`px-2 py-1 text-xs font-medium rounded ${
                statusColors[ticket.status] || statusColors.open
              }`}
            >
              {ticket.status.replace('_', ' ')}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            {ticket.messages.length} message{ticket.messages.length !== 1 ? 's' : ''} •{' '}
            {new Date(ticket.createdAt).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </div>
          {ticket.orderId && (
            <div className="text-xs text-gray-500 mt-1">Order: {ticket.orderId.slice(-8)}</div>
          )}
        </div>
        <div className="text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

