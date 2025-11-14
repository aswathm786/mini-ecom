/**
 * Address Form Fields Component
 * 
 * Reusable address form fields for create/edit.
 */

import { Address } from '../../hooks/useCheckout';

interface AddressFormFieldsProps {
  address: Partial<Address>;
  onChange: (address: Partial<Address>) => void;
  errors?: Record<string, string>;
}

export function AddressFormFields({ address, onChange, errors }: AddressFormFieldsProps) {
  const updateField = (field: keyof Address, value: any) => {
    onChange({ ...address, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="address-name" className="block text-sm font-medium text-gray-700 mb-1">
          Full Name *
        </label>
        <input
          id="address-name"
          type="text"
          required
          value={address.name || ''}
          onChange={(e) => updateField('name', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
            errors?.name ? 'border-red-300' : 'border-gray-300'
          }`}
        />
        {errors?.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="address-street" className="block text-sm font-medium text-gray-700 mb-1">
          Street Address *
        </label>
        <input
          id="address-street"
          type="text"
          required
          value={address.street || ''}
          onChange={(e) => updateField('street', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
            errors?.street ? 'border-red-300' : 'border-gray-300'
          }`}
        />
        {errors?.street && <p className="mt-1 text-sm text-red-600">{errors.street}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="address-city" className="block text-sm font-medium text-gray-700 mb-1">
            City *
          </label>
          <input
            id="address-city"
            type="text"
            required
            value={address.city || ''}
            onChange={(e) => updateField('city', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors?.city ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors?.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
        </div>

        <div>
          <label htmlFor="address-state" className="block text-sm font-medium text-gray-700 mb-1">
            State *
          </label>
          <input
            id="address-state"
            type="text"
            required
            value={address.state || ''}
            onChange={(e) => updateField('state', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors?.state ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors?.state && <p className="mt-1 text-sm text-red-600">{errors.state}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="address-pincode" className="block text-sm font-medium text-gray-700 mb-1">
            Pincode *
          </label>
          <input
            id="address-pincode"
            type="text"
            required
            pattern="[0-9]{6}"
            maxLength={6}
            value={address.pincode || ''}
            onChange={(e) => updateField('pincode', e.target.value.replace(/\D/g, ''))}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors?.pincode ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors?.pincode && <p className="mt-1 text-sm text-red-600">{errors.pincode}</p>}
        </div>

        <div>
          <label htmlFor="address-phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            id="address-phone"
            type="tel"
            value={address.phone || ''}
            onChange={(e) => updateField('phone', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors?.phone ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors?.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="address-country" className="block text-sm font-medium text-gray-700 mb-1">
          Country *
        </label>
        <input
          id="address-country"
          type="text"
          required
          value={address.country || 'India'}
          onChange={(e) => updateField('country', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
            errors?.country ? 'border-red-300' : 'border-gray-300'
          }`}
        />
        {errors?.country && <p className="mt-1 text-sm text-red-600">{errors.country}</p>}
      </div>
    </div>
  );
}

