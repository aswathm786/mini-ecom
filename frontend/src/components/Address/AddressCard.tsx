/**
 * Address Card Component
 * 
 * Displays address with edit/delete/set default actions.
 */

import { Address } from '../../hooks/useCheckout';
import { Button } from '../Button';

interface AddressCardProps {
  address: Address;
  onEdit: (address: Address) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  isDeleting?: boolean;
}

export function AddressCard({ address, onEdit, onDelete, onSetDefault, isDeleting }: AddressCardProps) {
  return (
    <div className="bg-white border-2 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          {address.isDefault && (
            <span className="inline-block px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded mb-2">
              Default
            </span>
          )}
          <div className="font-medium text-gray-900">{address.name}</div>
          <div className="text-sm text-gray-600 mt-1">
            {address.street}
            <br />
            {address.city}, {address.state} {address.pincode}
            <br />
            {address.country}
            {address.phone && (
              <>
                <br />
                Phone: {address.phone}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(address)}
          className="flex-1"
        >
          Edit
        </Button>
        {!address.isDefault && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSetDefault(address._id!)}
            className="flex-1"
          >
            Set Default
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(address._id!)}
          disabled={isDeleting}
          className="flex-1 text-red-600 hover:text-red-700"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

