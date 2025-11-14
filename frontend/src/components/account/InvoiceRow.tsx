/**
 * Invoice Row Component
 * 
 * Displays invoice in a list row format.
 */

import { formatCurrency } from '../../lib/format';

interface Invoice {
  _id: string;
  orderId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  createdAt: string;
  pdfUrl?: string;
}

interface InvoiceRowProps {
  invoice: Invoice;
  onDownload: (invoiceId: string) => void;
}

export function InvoiceRow({ invoice, onDownload }: InvoiceRowProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="font-medium text-gray-900">{invoice.invoiceNumber}</div>
          <div className="text-sm text-gray-600 mt-1">
            Order #{invoice.orderId.slice(-8)} •{' '}
            {new Date(invoice.createdAt).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-900">
              {formatCurrency(invoice.amount)}
            </div>
          </div>
          <button
            onClick={() => onDownload(invoice._id)}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium"
            aria-label={`Download invoice ${invoice.invoiceNumber}`}
          >
            <svg
              className="w-5 h-5 inline-block mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Download
          </button>
        </div>
      </div>
    </div>
  );
}

