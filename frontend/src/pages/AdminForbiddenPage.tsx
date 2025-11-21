export function AdminForbiddenPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-lg space-y-4">
        <p className="text-6xl">🚫</p>
        <h1 className="text-3xl font-bold text-gray-900">403 · Access Denied</h1>
        <p className="text-gray-600">
          This area is reserved for authorized staff. If you believe you should have access, please
          contact an administrator to assign the proper role.
        </p>
        <p className="text-sm text-gray-500">
          All access attempts are logged for security auditing.
        </p>
      </div>
    </div>
  );
}


