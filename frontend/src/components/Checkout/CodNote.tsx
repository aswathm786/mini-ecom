/**
 * COD Note Component
 * 
 * Information about Cash on Delivery payment method.
 */

export function CodNote() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h4 className="text-sm font-medium text-blue-800">Cash on Delivery</h4>
          <p className="mt-1 text-sm text-blue-700">
            Pay with cash when your order is delivered. Additional charges may apply for COD orders.
          </p>
        </div>
      </div>
    </div>
  );
}

