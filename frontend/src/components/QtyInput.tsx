/**
 * Quantity Input Component
 * 
 * Accessible quantity selector with increment/decrement buttons.
 */

import { useState, useEffect } from 'react';

interface QtyInputProps {
  value: number;
  onChange: (qty: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
}

export function QtyInput({
  value,
  onChange,
  min = 1,
  max = 999,
  disabled = false,
  className = '',
}: QtyInputProps) {
  const [localValue, setLocalValue] = useState(value.toString());

  useEffect(() => {
    setLocalValue(value.toString());
  }, [value]);

  const handleDecrement = () => {
    const newValue = Math.max(min, value - 1);
    onChange(newValue);
  };

  const handleIncrement = () => {
    const newValue = Math.min(max, value + 1);
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setLocalValue(inputValue);

    const numValue = parseInt(inputValue, 10);
    if (!isNaN(numValue) && numValue >= min && numValue <= max) {
      onChange(numValue);
    }
  };

  const handleBlur = () => {
    const numValue = parseInt(localValue, 10);
    if (isNaN(numValue) || numValue < min) {
      setLocalValue(min.toString());
      onChange(min);
    } else if (numValue > max) {
      setLocalValue(max.toString());
      onChange(max);
    } else {
      setLocalValue(numValue.toString());
    }
  };

  return (
    <div className={`flex items-center border border-gray-300 rounded-md ${className}`}>
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        className="px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-l-md"
        aria-label="Decrease quantity"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </button>
      
      <input
        type="number"
        value={localValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        min={min}
        max={max}
        disabled={disabled}
        className="w-16 px-2 py-2 text-center border-0 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
        aria-label="Quantity"
      />
      
      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        className="px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-r-md"
        aria-label="Increase quantity"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}

