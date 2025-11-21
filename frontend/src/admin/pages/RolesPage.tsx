/**
 * Admin Roles Page
 * 
 * Manage roles & assign permissions.
 */

import { useState, useEffect } from 'react';
import { useAdminApi } from '../hooks/useAdminApi';
import { PermissionMatrix } from '../components/PermissionMatrix';
import { Button } from '../../components/Button';
import { ToastContainer } from '../../components/Toast';

interface Role {
  _id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem?: boolean;
}

interface Permission {
  key: string;
  label: string;
  category: string;
}

export function RolesPage() {
  const api = useAdminApi();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }>>([]);

  useEffect(() => {
    loadRoles();
    loadPermissions();
  }, []);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const toastId = Date.now().toString();
    setToasts((prev) => [...prev, { id: toastId, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const loadRoles = async () => {
    try {
      const data = await api.get<Role[]>('/roles');
      setRoles(data);
      if (!selectedRole && data.length > 0) {
        setSelectedRole(data[0]);
      }
    } catch (err) {
      addToast('Failed to load roles', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRole.name.trim()) {
      addToast('Role name is required', 'error');
      return;
    }
    setCreating(true);
    try {
      const payload = {
        name: newRole.name.trim(),
        description: newRole.description.trim() || undefined,
        permissions: [],
      };
      const created = await api.post<Role>('/roles', payload);
      setRoles((prev) => [...prev, created]);
      setNewRole({ name: '', description: '' });
      addToast('Role created successfully', 'success');
    } catch (err) {
      addToast('Failed to create role', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    setDeletingRoleId(roleId);
    try {
      await api.delete(`/roles/${roleId}`);
      setRoles((prev) => prev.filter((role) => role._id !== roleId));
      if (selectedRole?._id === roleId) {
        setSelectedRole(null);
      }
      addToast('Role deleted', 'success');
    } catch (err) {
      addToast('Failed to delete role', 'error');
    } finally {
      setDeletingRoleId(null);
    }
  };

  const loadPermissions = async () => {
    try {
      const data = await api.get<Permission[]>('/permissions');
      setPermissions(data);
    } catch (err) {
      console.error('Failed to load permissions:', err);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;

    try {
      await api.put(`/roles/${selectedRole._id}`, {
        permissionKeys: selectedRole.permissions,
      });
      addToast('Permissions updated successfully', 'success');
      await loadRoles();
    } catch (err: any) {
      console.error('Error updating permissions:', err);
      const errorMessage = err?.response?.error || err?.message || 'Failed to update permissions';
      addToast(errorMessage, 'error');
    }
  };

  const handlePermissionChange = (permissionKey: string, granted: boolean) => {
    if (!selectedRole) return;

    const newPermissions = granted
      ? [...selectedRole.permissions, permissionKey]
      : selectedRole.permissions.filter((p) => p !== permissionKey);

    setSelectedRole({ ...selectedRole, permissions: newPermissions });
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Roles & Permissions</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Roles</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <input
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="Role name"
                value={newRole.name}
                onChange={(e) => setNewRole((prev) => ({ ...prev, name: e.target.value }))}
              />
              <input
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="Description"
                value={newRole.description}
                onChange={(e) => setNewRole((prev) => ({ ...prev, description: e.target.value }))}
              />
              <Button type="button" size="sm" isLoading={creating} onClick={handleCreateRole}>
                Create Role
              </Button>
            </div>

            <div className="space-y-2">
              {roles.map((role) => (
                <div
                  key={role._id}
                  className={`flex items-start justify-between rounded-md border px-4 py-2 ${
                    selectedRole?._id === role._id ? 'border-primary-200 bg-primary-50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <button
                    type="button"
                    className="text-left flex-1"
                    onClick={() => setSelectedRole(role)}
                  >
                    <p className="font-medium">{role.name}</p>
                    {role.description && (
                      <p className="text-sm text-gray-600">{role.description}</p>
                    )}
                  </button>
                  {!role.isSystem && role.name.toLowerCase() !== 'admin' && role.name.toLowerCase() !== 'root' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      isLoading={deletingRoleId === role._id}
                      onClick={() => handleDeleteRole(role._id)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Permissions Matrix */}
        <div className="lg:col-span-2">
          {selectedRole ? (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  {selectedRole.name} Permissions
                </h2>
                {selectedRole.description && (
                  <p className="text-sm text-gray-600 mb-4">{selectedRole.description}</p>
                )}
                <PermissionMatrix
                  permissions={permissions}
                  selectedPermissions={selectedRole.permissions}
                  onPermissionChange={handlePermissionChange}
                />
                <div className="mt-6">
                  <Button variant="primary" onClick={handleSavePermissions}>
                    Save Permissions
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center text-gray-500">
              Select a role to manage permissions
            </div>
          )}
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

