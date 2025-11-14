/**
 * Refund Dialog Component
 * 
 * Modal for creating refunds with amount and reason.
 */

import { useState } from 'react';
import { Button } from '../../components/Button';
import { formatCurrency } from '../../lib/format';

interface RefundDialogProps {
  isOpen: boolean;
  order: {
    _id: string;
    amount: number;
    currency: string;
    refunds?: Array<{ amount: number }>;
  };
  onClose: () => void;
  onConfirm: (amount: number, reason: string) => void;
}

export function RefundDialog({ isOpen, order, onClose, onConfirm }: RefundDialogProps) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalRefunded = order.refunds?.reduce((sum, r) => sum + r.amount, 0) || 0;
  const maxRefund = order.amount - totalRefunded;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const refundAmount = parseFloat(amount);
    if (isNaN(refundAmount) || refundAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (refundAmount > maxRefund) {
      setError(`Maximum refund amount is ${formatCurrency(maxRefund)}`);
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for the refund');
      return;
    }

    onConfirm(refundAmount, reason.trim());
    setAmount('');
    setReason('');
    setError(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4" id="modal-title">
                Create Refund
              </h3>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="refund-amount" className="block text-sm font-medium text-gray-700 mb-1">
                    Refund Amount ({order.currency})
                  </label>
                  <input
                    id="refund-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={maxRefund}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder={`Max: ${formatCurrency(maxRefund)}`}
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Order total: {formatCurrency(order.amount)} | Already refunded: {formatCurrency(totalRefunded)} | Max refund: {formatCurrency(maxRefund)}
                  </p>
                </div>

                <div>
                  <label htmlFor="refund-reason" className="block text-sm font-medium text-gray-700 mb-1">
                    Reason *
                  </label>
                  <textarea
                    id="refund-reason"
                    rows={4}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter reason for refund..."
                    required
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <Button type="submit" variant="primary" className="sm:ml-3 sm:w-auto">
                Create Refund
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="mt-3 sm:mt-0 sm:w-auto"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

