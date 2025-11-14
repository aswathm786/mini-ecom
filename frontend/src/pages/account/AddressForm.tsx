/**
 * Address Form Component
 * 
 * Form for creating/editing addresses.
 */

import { useState, useEffect } from 'react';
import { AddressFormFields } from '../../components/Address/AddressFormFields';
import { Button } from '../../components/Button';
import { useAddresses } from '../../hooks/useAddresses';
import { Address } from '../../hooks/useCheckout';
import { validateRequired, validatePincode, validatePhone, rules, getValidationError } from '../../lib/validators';

interface AddressFormProps {
  address?: Address;
  onSave: () => void;
  onCancel: () => void;
}

export function AddressForm({ address, onSave, onCancel }: AddressFormProps) {
  const { createAddress, updateAddress } = useAddresses();
  const [formData, setFormData] = useState<Partial<Address>>({
    name: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (address) {
      setFormData(address);
    }
  }, [address]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    const nameError = getValidationError('Name', formData.name, [rules.required()]);
    if (nameError) newErrors.name = nameError;

    const streetError = getValidationError('Street', formData.street, [rules.required()]);
    if (streetError) newErrors.street = streetError;

    const cityError = getValidationError('City', formData.city, [rules.required()]);
    if (cityError) newErrors.city = cityError;

    const stateError = getValidationError('State', formData.state, [rules.required()]);
    if (stateError) newErrors.state = stateError;

    if (formData.pincode) {
      const pincodeError = getValidationError('Pincode', formData.pincode, [rules.pincode()]);
      if (pincodeError) newErrors.pincode = pincodeError;
    } else {
      newErrors.pincode = 'Pincode is required';
    }

    if (formData.phone) {
      const phoneError = getValidationError('Phone', formData.phone, [rules.phone()]);
      if (phoneError) newErrors.phone = phoneError;
    }

    const countryError = getValidationError('Country', formData.country, [rules.required()]);
    if (countryError) newErrors.country = countryError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSaving(true);
    try {
      if (address?._id) {
        await updateAddress(address._id, formData);
      } else {
        await createAddress(formData as Omit<Address, '_id'>);
      }
      onSave();
    } catch (error) {
      console.error('Error saving address:', error);
      // Error is handled by useAddresses hook
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        {address ? 'Edit Address' : 'Add New Address'}
      </h2>

      <form onSubmit={handleSubmit}>
        <AddressFormFields address={formData} onChange={setFormData} errors={errors} />

        <div className="mt-6 flex gap-3">
          <Button type="submit" variant="primary" isLoading={saving}>
            {address ? 'Update Address' : 'Save Address'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

