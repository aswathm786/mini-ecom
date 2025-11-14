/**
 * Admin Shipments Page
 * 
 * List, create, track, and cancel shipments.
 */

import { useState } from 'react';
import { useShipments } from '../hooks/useShipments';
import { DatasetTable } from '../components/DatasetTable';
import { FiltersBar } from '../components/FiltersBar';
import { ShipmentDialog } from '../components/ShipmentDialog';
import { ConfirmAction } from '../components/ConfirmAction';
import { Link } from 'react-router-dom';
import { Button } from '../../components/Button';
import { ToastContainer } from '../../components/Toast';

export function ShipmentsPage() {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const { shipments, loading, error, total, page, pages, setPage, setFilters: setShipmentsFilters, createShipment, cancelShipment, downloadLabel, refetch } = useShipments({
    page: 1,
    limit: 20,
  });
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }>>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const toastId = Date.now().toString();
    setToasts((prev) => [...prev, { id: toastId, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setShipmentsFilters(newFilters);
    setPage(1);
  };

  const handleCreateShipment = async (data: any) => {
    try {
      await createShipment(data);
      addToast('Shipment created successfully', 'success');
      setShowCreateDialog(false);
    } catch (err) {
      addToast('Failed to create shipment', 'error');
    }
  };

  const handleCancelShipment = (shipmentId: string) => {
    setCancellingId(shipmentId);
    setShowCancelConfirm(true);
  };

  const confirmCancelShipment = async () => {
    if (cancellingId) {
      const success = await cancelShipment(cancellingId);
      if (success) {
        addToast('Shipment cancelled successfully', 'success');
      } else {
        addToast('Failed to cancel shipment', 'error');
      }
      setCancellingId(null);
      setShowCancelConfirm(false);
    }
  };

  const handleDownloadLabel = async (shipmentId: string) => {
    try {
      await downloadLabel(shipmentId);
      addToast('Label downloaded successfully', 'success');
    } catch (err) {
      addToast('Failed to download label', 'error');
    }
  };

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'picked_up', label: 'Picked Up' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const columns = [
    {
      key: '_id',
      label: 'Shipment ID',
      render: (shipment: any) => <span className="font-mono text-sm">{shipment._id.slice(-8)}</span>,
    },
    {
      key: 'orderId',
      label: 'Order',
      render: (shipment: any) => (
        <Link to={`/admin/orders/${shipment.orderId}`} className="text-primary-600 hover:text-primary-700">
          {shipment.orderId.slice(-8)}
        </Link>
      ),
    },
    {
      key: 'awb',
      label: 'AWB',
      render: (shipment: any) => (
        shipment.awb ? (
          <Link to={`/account/tracking/${shipment.awb}`} className="font-mono text-sm text-primary-600 hover:text-primary-700">
            {shipment.awb}
          </Link>
        ) : (
          <span className="text-gray-400">Not assigned</span>
        )
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (shipment: any) => {
        const statusColors: Record<string, string> = {
          pending: 'bg-yellow-100 text-yellow-800',
          picked_up: 'bg-blue-100 text-blue-800',
          in_transit: 'bg-indigo-100 text-indigo-800',
          delivered: 'bg-green-100 text-green-800',
          cancelled: 'bg-red-100 text-red-800',
        };
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded ${statusColors[shipment.status] || statusColors.pending}`}>
            {shipment.status}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (shipment: any) => (
        <div className="flex gap-2">
          {shipment.awb && (
            <button
              onClick={() => handleDownloadLabel(shipment._id)}
              className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Label
            </button>
          )}
          {shipment.status !== 'delivered' && shipment.status !== 'cancelled' && (
            <button
              onClick={() => handleCancelShipment(shipment._id)}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              Cancel
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Shipments</h1>
        <Button variant="primary" onClick={() => setShowCreateDialog(true)}>
          Create Shipment
        </Button>
      </div>

      <FiltersBar
        filters={filters}
        onFilterChange={handleFilterChange}
        statusOptions={statusOptions}
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      <DatasetTable
        data={shipments}
        columns={columns}
        loading={loading}
        page={page}
        pages={pages}
        total={total}
        onPageChange={setPage}
        emptyMessage="No shipments found"
      />

      <ShipmentDialog
        isOpen={showCreateDialog}
        orderId=""
        onClose={() => setShowCreateDialog(false)}
        onConfirm={handleCreateShipment}
      />

      <ConfirmAction
        isOpen={showCancelConfirm}
        title="Cancel Shipment"
        message="Are you sure you want to cancel this shipment? This action cannot be undone."
        confirmText="Cancel Shipment"
        onConfirm={confirmCancelShipment}
        onCancel={() => {
          setShowCancelConfirm(false);
          setCancellingId(null);
        }}
        variant="danger"
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

