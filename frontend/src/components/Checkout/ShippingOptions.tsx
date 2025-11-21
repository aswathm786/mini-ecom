/**
 * Shipping Options Component
 * 
 * Displays available shipping methods and rates.
 */

import { useState, useEffect } from 'react';
import { csrfFetch } from '../../lib/csrfFetch';
import { formatCurrency } from '../../lib/format';
import { ShippingOption } from '../../hooks/useCheckout';

interface ShippingOptionsProps {
  pincode: string;
  selected?: string;
  onSelect: (service: string, charge?: number) => void;
  onOptionsLoaded?: (options: ShippingOption[]) => void;
}

export function ShippingOptions({ pincode, selected, onSelect, onOptionsLoaded }: ShippingOptionsProps) {
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pincode && pincode.length === 6) {
      loadShippingRates();
    } else {
      setOptions([]);
    }
  }, [pincode]);

  const loadShippingRates = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await csrfFetch(`/api/shipping/rates?to_pincode=${pincode}`);
      if (response.ok && response.data) {
        setOptions(response.data);
        onOptionsLoaded?.(response.data);
        // Auto-select first option if none selected
        if (!selected && response.data.length > 0) {
          onSelect(response.data[0].service, response.data[0].charge);
        }
      } else {
        setError(response.error || 'Failed to load shipping rates');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shipping rates');
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  if (!pincode || pincode.length !== 6) {
    return (
      <div className="text-sm text-gray-500">
        Enter a valid pincode to see shipping options
      </div>
    );
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
        <p className="text-sm text-yellow-800">{error}</p>
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No shipping options available for this pincode
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Shipping Method</h3>
      {options.map((option) => (
        <label
          key={option.service}
          className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
            selected === option.service
              ? 'border-primary-600 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <input
            type="radio"
            name="shipping"
            value={option.service}
            checked={selected === option.service}
            onChange={() => onSelect(option.service, option.charge)}
            className="sr-only"
          />
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">{option.name}</div>
              <div className="text-sm text-gray-600">
                Estimated delivery: {option.estimatedDays} days
              </div>
            </div>
            <div className="font-semibold text-gray-900">
              {option.charge === 0 ? 'Free' : formatCurrency(option.charge)}
            </div>
          </div>
        </label>
      ))}
    </div>
  );
}

