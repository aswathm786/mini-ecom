/**
 * Admin Users Page
 * 
 * List users, search by email, quick view.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsersAdmin } from '../hooks/useUsersAdmin';
import { DatasetTable } from '../components/DatasetTable';
import { FiltersBar } from '../components/FiltersBar';

export function UsersPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Record<string, any>>({});
  const { users, loading, error, total, page, pages, setPage, setFilters: setUsersFilters } = useUsersAdmin({
    page: 1,
    limit: 20,
  });

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setUsersFilters(newFilters);
    setPage(1);
  };

  const columns = [
    {
      key: 'email',
      label: 'Email',
      render: (user: any) => <span className="font-medium text-gray-900">{user.email}</span>,
    },
    {
      key: 'name',
      label: 'Name',
      render: (user: any) => (
        <span>
          {user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : 'N/A'}
        </span>
      ),
    },
    {
      key: 'roles',
      label: 'Roles',
      render: (user: any) => (
        <div className="flex gap-1">
          {user.roles?.map((role: string) => (
            <span key={role} className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded">
              {role}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (user: any) => {
        const statusColors: Record<string, string> = {
          active: 'bg-green-100 text-green-800',
          suspended: 'bg-yellow-100 text-yellow-800',
          deleted: 'bg-red-100 text-red-800',
        };
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded ${statusColors[user.status] || statusColors.active}`}>
            {user.status}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      label: 'Joined',
      render: (user: any) => (
        <span>{new Date(user.createdAt).toLocaleDateString('en-IN')}</span>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Users</h1>

      <FiltersBar
        filters={filters}
        onFilterChange={handleFilterChange}
        searchPlaceholder="Search by email..."
        customFilters={[
          {
            key: 'role',
            label: 'Role',
            type: 'text',
          },
          {
            key: 'status',
            label: 'Status',
            type: 'select',
            options: [
              { value: 'active', label: 'Active' },
              { value: 'suspended', label: 'Suspended' },
              { value: 'deleted', label: 'Deleted' },
            ],
          },
        ]}
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      <DatasetTable
        data={users}
        columns={columns}
        loading={loading}
        page={page}
        pages={pages}
        total={total}
        onPageChange={setPage}
        onRowClick={(user) => navigate(`/admin/users/${user._id}`)}
        emptyMessage="No users found"
      />
    </div>
  );
}

