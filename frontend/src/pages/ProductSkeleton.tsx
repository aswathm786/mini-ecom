/**
 * Product Skeleton Component
 * 
 * Loading skeleton for product cards.
 */

export function ProductSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
      <div className="aspect-w-1 aspect-h-1 bg-gray-200 h-48"></div>
      <div className="p-4">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-2/3 mb-4"></div>
        <div className="flex items-center justify-between mb-3">
          <div className="h-6 bg-gray-200 rounded w-20"></div>
          <div className="h-5 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="h-10 bg-gray-200 rounded w-full"></div>
      </div>
    </div>
  );
}

