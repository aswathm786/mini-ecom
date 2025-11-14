/**
 * Permission Matrix Component
 * 
 * UI for granting/revoking permissions to roles.
 */

interface Permission {
  key: string;
  label: string;
  category: string;
}

interface PermissionMatrixProps {
  permissions: Permission[];
  selectedPermissions: string[];
  onPermissionChange: (permissionKey: string, granted: boolean) => void;
}

export function PermissionMatrix({
  permissions,
  selectedPermissions,
  onPermissionChange,
}: PermissionMatrixProps) {
  const categories = Array.from(new Set(permissions.map((p) => p.category)));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Permissions</h3>
      <div className="space-y-6">
        {categories.map((category) => {
          const categoryPermissions = permissions.filter((p) => p.category === category);
          return (
            <div key={category}>
              <h4 className="text-sm font-medium text-gray-700 mb-2 capitalize">{category}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {categoryPermissions.map((permission) => (
                  <label
                    key={permission.key}
                    className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(permission.key)}
                      onChange={(e) => onPermissionChange(permission.key, e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">{permission.label}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

