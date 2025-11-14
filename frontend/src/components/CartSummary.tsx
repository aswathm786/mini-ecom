/**
 * Cart Summary Component
 * 
 * Displays cart totals and checkout button.
 */

import { Link } from 'react-router-dom';
import { formatCurrency } from '../lib/format';
import { useCart } from '../hooks/useCart';
import { Button } from './Button';

interface CartSummaryProps {
  className?: string;
}

export function CartSummary({ className = '' }: CartSummaryProps) {
  const { subtotal, itemCount } = useCart();

  // Placeholder values - will be calculated from order in later parts
  const shipping = 0; // TODO: Calculate shipping
  const tax = subtotal * 0.18; // TODO: Get tax rate from config
  const total = subtotal + shipping + tax;

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
      
      <div className="space-y-3 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal ({itemCount} items)</span>
          <span className="text-gray-900 font-medium">{formatCurrency(subtotal)}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Shipping</span>
          <span className="text-gray-900 font-medium">
            {shipping === 0 ? 'Free' : formatCurrency(shipping)}
          </span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Tax</span>
          <span className="text-gray-900 font-medium">{formatCurrency(tax)}</span>
        </div>
        
        <div className="border-t border-gray-200 pt-3">
          <div className="flex justify-between">
            <span className="text-base font-semibold text-gray-900">Total</span>
            <span className="text-base font-semibold text-gray-900">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
      
      <Link to="/checkout" className="block">
        <Button variant="primary" size="lg" className="w-full">
          Proceed to Checkout
        </Button>
      </Link>
      
      <p className="mt-4 text-xs text-gray-500 text-center">
        Checkout functionality will be implemented in later parts
      </p>
    </div>
  );
}

