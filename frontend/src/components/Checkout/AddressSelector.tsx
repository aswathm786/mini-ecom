/**
 * Address Selector Component
 * 
 * Allows selecting existing address or entering new address.
 */

import { useState, useEffect } from 'react';
import { csrfFetch } from '../../lib/csrfFetch';
import { Address } from '../../hooks/useCheckout';
import { Button } from '../Button';

interface AddressSelectorProps {
  selectedAddress?: Address;
  onSelect: (address: Address) => void;
  onNewAddress: (address: Address) => void;
}

export function AddressSelector({ selectedAddress, onSelect, onNewAddress }: AddressSelectorProps) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [loadingPincode, setLoadingPincode] = useState(false);
  const [newAddress, setNewAddress] = useState<Address>({
    name: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    phone: '',
  });

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const response = await csrfFetch('/api/addresses');
      if (response.ok && response.data) {
        setAddresses(response.data);
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePincodeChange = async (pincode: string) => {
    // Remove non-numeric characters
    const cleanPincode = pincode.replace(/\D/g, '');
    setNewAddress({ ...newAddress, pincode: cleanPincode });
    
    // Auto-fetch city and state if pincode is 6 digits
    if (cleanPincode.length === 6 && /^\d{6}$/.test(cleanPincode)) {
      setLoadingPincode(true);
      try {
        const response = await csrfFetch(`/api/pincode/${cleanPincode}`);
        if (response.ok && response.data) {
          const { city, state } = response.data;
          setNewAddress(prev => ({
            ...prev,
            ...(city && { city }),
            ...(state && { state }),
          }));
        }
      } catch (error) {
        console.error('Error fetching pincode data:', error);
        // Silently fail - user can manually enter city/state
      } finally {
        setLoadingPincode(false);
      }
    }
  };

  const handleSaveNewAddress = async () => {
    // Validate
    if (!newAddress.name || !newAddress.street || !newAddress.city || !newAddress.state || !newAddress.pincode) {
      return;
    }

    try {
      const response = await csrfFetch('/api/addresses', {
        method: 'POST',
        body: JSON.stringify(newAddress),
      });

      if (response.ok && response.data) {
        const savedAddress = response.data;
        setAddresses([...addresses, savedAddress]);
        onNewAddress(savedAddress);
        setShowNewForm(false);
        // Reset form
        setNewAddress({
          name: '',
          street: '',
          city: '',
          state: '',
          pincode: '',
          country: 'India',
          phone: '',
        });
      }
    } catch (error) {
      console.error('Error saving address:', error);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading addresses...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Shipping Address</h3>

      {/* Existing Addresses */}
      {addresses.length > 0 && (
        <div className="space-y-2">
          {addresses.map((address) => (
            <label
              key={address._id}
              className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                selectedAddress?._id === address._id
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="address"
                value={address._id}
                checked={selectedAddress?._id === address._id}
                onChange={() => onSelect(address)}
                className="sr-only"
              />
              <div>
                <div className="font-medium text-gray-900">{address.name}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {address.street}, {address.city}, {address.state} {address.pincode}
                </div>
                {address.phone && (
                  <div className="text-sm text-gray-600">Phone: {address.phone}</div>
                )}
              </div>
            </label>
          ))}
        </div>
      )}

      {/* New Address Form */}
      {showNewForm ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-gray-900">New Address</h4>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                id="name"
                type="text"
                required
                value={newAddress.name}
                onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">
                Street Address *
              </label>
              <input
                id="street"
                type="text"
                required
                value={newAddress.street}
                onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <input
                  id="city"
                  type="text"
                  required
                  value={newAddress.city}
                  onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                  State *
                </label>
                <input
                  id="state"
                  type="text"
                  required
                  value={newAddress.state}
                  onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="pincode" className="block text-sm font-medium text-gray-700 mb-1">
                  Pincode * {loadingPincode && <span className="text-xs text-gray-500">(Looking up...)</span>}
                </label>
                <input
                  id="pincode"
                  type="text"
                  required
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={newAddress.pincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={newAddress.phone}
                  onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="primary"
                onClick={handleSaveNewAddress}
                className="flex-1"
              >
                Save Address
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewForm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowNewForm(true)}
          className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-600 hover:text-primary-600 transition-colors"
        >
          + Add New Address
        </button>
      )}
    </div>
  );
}

