/**
 * Order Actions Component
 * 
 * Action buttons for order management (status change, capture, refund, shipment, invoice).
 */

import { useState } from 'react';
import { Button } from '../../components/Button';
import { ConfirmAction } from './ConfirmAction';
import { RefundDialog } from './RefundDialog';
import { ShipmentDialog } from './ShipmentDialog';
import { useAuth } from '../../contexts/AuthContext';

interface OrderActionsProps {
  order: {
    _id: string;
    status: string;
    payment?: {
      status: string;
      gateway: string;
    };
    amount: number;
  };
  onStatusChange: (status: string) => void;
  onManualCapture: () => void;
  onRefund: (amount: number, reason: string) => void;
  onCreateShipment: (data: any) => void;
  onDownloadInvoice?: () => void;
}

export function OrderActions({
  order,
  onStatusChange,
  onManualCapture,
  onRefund,
  onCreateShipment,
  onDownloadInvoice,
}: OrderActionsProps) {
  const { user } = useAuth();
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [showShipmentDialog, setShowShipmentDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');

  // TODO: Implement proper permission checks
  const hasPermission = (permission: string) => {
    // Placeholder - should check user.permissions array
    return user?.role === 'admin' || user?.role === 'root';
  };

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    setShowStatusModal(true);
  };

  const confirmStatusChange = () => {
    onStatusChange(selectedStatus);
    setShowStatusModal(false);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {/* Status Change */}
      {hasPermission('order.update') && (
        <select
          value={order.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      {/* Manual Capture */}
      {hasPermission('order.capture') &&
        order.payment?.status === 'authorized' &&
        order.payment?.gateway === 'razorpay' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm('Are you sure you want to manually capture this payment?')) {
                onManualCapture();
              }
            }}
          >
            Capture Payment
          </Button>
        )}

      {/* Refund */}
      {hasPermission('order.refund') && order.status !== 'cancelled' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRefundDialog(true)}
        >
          Refund
        </Button>
      )}

      {/* Create Shipment */}
      {hasPermission('shipment.create') && order.status === 'paid' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowShipmentDialog(true)}
        >
          Create Shipment
        </Button>
      )}

      {/* Download Invoice */}
      {hasPermission('invoice.download') && onDownloadInvoice && (
        <Button
          variant="outline"
          size="sm"
          onClick={onDownloadInvoice}
        >
          Download Invoice
        </Button>
      )}

      <ConfirmAction
        isOpen={showStatusModal}
        title="Change Order Status"
        message={`Are you sure you want to change the order status to "${statusOptions.find((o) => o.value === selectedStatus)?.label}"?`}
        confirmText="Change Status"
        onConfirm={confirmStatusChange}
        onCancel={() => setShowStatusModal(false)}
        variant="warning"
      />

      <RefundDialog
        isOpen={showRefundDialog}
        order={order}
        onClose={() => setShowRefundDialog(false)}
        onConfirm={onRefund}
      />

      <ShipmentDialog
        isOpen={showShipmentDialog}
        orderId={order._id}
        onClose={() => setShowShipmentDialog(false)}
        onConfirm={onCreateShipment}
      />
    </div>
  );
}

