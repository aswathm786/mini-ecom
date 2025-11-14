/**
 * Payment Methods Component
 * 
 * Payment method selection (Razorpay or COD).
 */

import { CodNote } from './CodNote';

interface PaymentMethodsProps {
  selected: 'razorpay' | 'cod';
  onSelect: (method: 'razorpay' | 'cod') => void;
}

export function PaymentMethods({ selected, onSelect }: PaymentMethodsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Payment Method</h3>

      <div className="space-y-3">
        <label
          className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
            selected === 'razorpay'
              ? 'border-primary-600 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <input
            type="radio"
            name="payment_method"
            value="razorpay"
            checked={selected === 'razorpay'}
            onChange={() => onSelect('razorpay')}
            className="sr-only"
          />
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Pay Online</div>
              <div className="text-sm text-gray-600 mt-1">
                Credit/Debit Card, UPI, Net Banking, Wallets
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <img
                src="https://razorpay.com/assets/razorpay-glyph.svg"
                alt="Razorpay"
                className="h-8"
                onError={(e) => {
                  // Fallback if image fails to load
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          </div>
        </label>

        <label
          className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
            selected === 'cod'
              ? 'border-primary-600 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <input
            type="radio"
            name="payment_method"
            value="cod"
            checked={selected === 'cod'}
            onChange={() => onSelect('cod')}
            className="sr-only"
          />
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Cash on Delivery</div>
              <div className="text-sm text-gray-600 mt-1">
                Pay when you receive your order
              </div>
            </div>
          </div>
        </label>
      </div>

      {selected === 'cod' && <CodNote />}
    </div>
  );
}

