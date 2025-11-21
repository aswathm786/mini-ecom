/**
 * Address Form Fields Component
 * 
 * Reusable address form fields for create/edit.
 */

import { useState, useEffect } from 'react';
import { Address } from '../../hooks/useCheckout';
import { csrfFetch } from '../../lib/csrfFetch';

interface AddressFormFieldsProps {
  address: Partial<Address>;
  onChange: (address: Partial<Address>) => void;
  errors?: Record<string, string>;
}

interface Country {
  _id: string;
  name: string;
  code: string;
  isDefault: boolean;
}

export function AddressFormFields({ address, onChange, errors }: AddressFormFieldsProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingPincode, setLoadingPincode] = useState(false);

  useEffect(() => {
    loadCountries();
  }, []);

  const loadCountries = async () => {
    try {
      const response = await csrfFetch('/api/countries');
      if (response.ok && response.data) {
        setCountries(response.data);
        // Set default country if not set
        if (!address.country && response.data.length > 0) {
          const defaultCountry = response.data.find((c: Country) => c.isDefault) || response.data[0];
          updateField('country', defaultCountry.name);
        }
      }
    } catch (error) {
      console.error('Error loading countries:', error);
      // Fallback to India if API fails
      if (!address.country) {
        updateField('country', 'India');
      }
    }
  };

  const updateField = (field: keyof Address, value: any) => {
    onChange({ ...address, [field]: value });
  };

  const handlePincodeChange = async (pincode: string) => {
    updateField('pincode', pincode);
    
    // Auto-fetch city and state if pincode is 6 digits
    if (pincode.length === 6 && /^\d{6}$/.test(pincode)) {
      setLoadingPincode(true);
      try {
        const response = await csrfFetch(`/api/pincode/${pincode}`);
        if (response.ok && response.data) {
          const { city, state } = response.data;
          if (city) updateField('city', city);
          if (state) updateField('state', state);
        }
      } catch (error) {
        console.error('Error fetching pincode data:', error);
        // Silently fail - user can manually enter city/state
      } finally {
        setLoadingPincode(false);
      }
    }
  };

  const isCountryDisabled = countries.length === 1;

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
            Pincode * {loadingPincode && <span className="text-xs text-gray-500">(Looking up...)</span>}
          </label>
          <input
            id="address-pincode"
            type="text"
            required
            pattern="[0-9]{6}"
            maxLength={6}
            value={address.pincode || ''}
            onChange={(e) => handlePincodeChange(e.target.value.replace(/\D/g, ''))}
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
        {isCountryDisabled ? (
          <input
            id="address-country"
            type="text"
            required
            disabled
            value={address.country || countries[0]?.name || 'India'}
            className={`w-full px-3 py-2 border rounded-md bg-gray-100 cursor-not-allowed ${
              errors?.country ? 'border-red-300' : 'border-gray-300'
            }`}
          />
        ) : (
          <select
            id="address-country"
            required
            value={address.country || countries.find(c => c.isDefault)?.name || countries[0]?.name || ''}
            onChange={(e) => updateField('country', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors?.country ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            {countries.map((country) => (
              <option key={country._id} value={country.name}>
                {country.name}
              </option>
            ))}
          </select>
        )}
        {errors?.country && <p className="mt-1 text-sm text-red-600">{errors.country}</p>}
      </div>
    </div>
  );
}

