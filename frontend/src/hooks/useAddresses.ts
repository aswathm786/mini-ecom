/**
 * useAddresses Hook
 * 
 * Manages user addresses: list, create, update, delete, set default.
 */

import { useState, useCallback, useEffect } from 'react';
import { csrfFetch } from '../lib/csrfFetch';
import { Address } from '../hooks/useCheckout';

interface UseAddressesResult {
  addresses: Address[];
  loading: boolean;
  error: string | null;
  createAddress: (address: Omit<Address, '_id'>) => Promise<Address | null>;
  updateAddress: (id: string, address: Partial<Address>) => Promise<boolean>;
  deleteAddress: (id: string) => Promise<boolean>;
  setDefaultAddress: (id: string) => Promise<boolean>;
  refetch: () => void;
}

export function useAddresses(): UseAddressesResult {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await csrfFetch('/api/addresses');
      if (response.ok && response.data) {
        setAddresses(Array.isArray(response.data) ? response.data : []);
      } else {
        setError(response.error || 'Failed to fetch addresses');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  const createAddress = useCallback(async (address: Omit<Address, '_id'>): Promise<Address | null> => {
    setError(null);
    try {
      const response = await csrfFetch('/api/addresses', {
        method: 'POST',
        body: JSON.stringify(address),
      });

      if (response.ok && response.data) {
        const newAddress = response.data as Address;
        setAddresses((prev) => [...prev, newAddress]);
        return newAddress;
      } else {
        throw new Error(response.error || 'Failed to create address');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create address');
      throw err;
    }
  }, []);

  const updateAddress = useCallback(async (id: string, address: Partial<Address>): Promise<boolean> => {
    setError(null);
    try {
      const response = await csrfFetch(`/api/addresses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(address),
      });

      if (response.ok) {
        setAddresses((prev) =>
          prev.map((addr) => (addr._id === id ? { ...addr, ...address } : addr))
        );
        return true;
      } else {
        throw new Error(response.error || 'Failed to update address');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update address');
      throw err;
    }
  }, []);

  const deleteAddress = useCallback(async (id: string): Promise<boolean> => {
    setError(null);
    try {
      const response = await csrfFetch(`/api/addresses/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAddresses((prev) => prev.filter((addr) => addr._id !== id));
        return true;
      } else {
        throw new Error(response.error || 'Failed to delete address');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete address');
      throw err;
    }
  }, []);

  const setDefaultAddress = useCallback(async (id: string): Promise<boolean> => {
    setError(null);
    try {
      const response = await csrfFetch(`/api/addresses/${id}/set-default`, {
        method: 'POST',
      });

      if (response.ok) {
        setAddresses((prev) =>
          prev.map((addr) => ({ ...addr, isDefault: addr._id === id }))
        );
        return true;
      } else {
        throw new Error(response.error || 'Failed to set default address');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default address');
      throw err;
    }
  }, []);

  // Fetch addresses on mount
  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  return {
    addresses,
    loading,
    error,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    refetch: fetchAddresses,
  };
}

