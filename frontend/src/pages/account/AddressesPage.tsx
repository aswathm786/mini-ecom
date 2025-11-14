/**
 * Addresses Page
 * 
 * List and manage user addresses.
 */

import { useState } from 'react';
import { useAddresses } from '../../hooks/useAddresses';
import { AddressCard } from '../../components/Address/AddressCard';
import { AddressForm } from './AddressForm';
import { Button } from '../../components/Button';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { Address } from '../../hooks/useCheckout';

export function AddressesPage() {
  const { addresses, loading, error, deleteAddress, setDefaultAddress, refetch } = useAddresses();
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (deletingId) {
      try {
        await deleteAddress(deletingId);
        setShowDeleteConfirm(false);
        setDeletingId(null);
      } catch (error) {
        console.error('Error deleting address:', error);
      }
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultAddress(id);
    } catch (error) {
      console.error('Error setting default address:', error);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingAddress(null);
    refetch();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Addresses</h1>
        <Button
          variant="primary"
          onClick={() => {
            setEditingAddress(null);
            setShowForm(true);
          }}
        >
          Add New Address
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-6">
          <AddressForm
            address={editingAddress || undefined}
            onSave={handleFormClose}
            onCancel={handleFormClose}
          />
        </div>
      )}

      {addresses.length === 0 && !showForm ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <p className="text-gray-600 mb-4">You haven't added any addresses yet.</p>
          <Button variant="primary" onClick={() => setShowForm(true)}>
            Add Your First Address
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <AddressCard
              key={address._id}
              address={address}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
              isDeleting={deletingId === address._id}
            />
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Address"
        message="Are you sure you want to delete this address? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeletingId(null);
        }}
      />
    </div>
  );
}

