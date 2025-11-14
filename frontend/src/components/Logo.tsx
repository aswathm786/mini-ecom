/**
 * Logo Component
 * 
 * Application logo/branding component.
 */

export function Logo() {
  return (
    <div className="flex items-center space-x-2">
      <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-lg">H</span>
      </div>
      <span className="text-xl font-bold text-gray-900 hidden sm:inline">
        Handmade Harmony
      </span>
    </div>
  );
}

