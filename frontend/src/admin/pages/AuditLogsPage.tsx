/**
 * Admin Audit Logs Page
 * 
 * Searchable audit log table.
 */

import { useState, useEffect } from 'react';
import { useAdminApi } from '../hooks/useAdminApi';
import { DatasetTable } from '../components/DatasetTable';
import { FiltersBar } from '../components/FiltersBar';

interface AuditLog {
  _id: string;
  actor: string;
  action: string;
  object: string;
  meta?: any;
  createdAt: string;
}

export function AuditLogsPage() {
  const api = useAdminApi();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);

  useEffect(() => {
    loadLogs();
  }, [page, filters]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const queryParams: Record<string, any> = {
        page: page.toString(),
        limit: '20',
      };
      if (filters.search) queryParams.search = filters.search;
      if (filters.actor) queryParams.actor = filters.actor;
      if (filters.action) queryParams.action = filters.action;

      const data = await api.get<{ items: AuditLog[]; total: number; pages: number }>('/audit', queryParams);
      setLogs(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters({ ...filters, [key]: value });
    setPage(1);
  };

  const columns = [
    {
      key: 'createdAt',
      label: 'Timestamp',
      render: (log: AuditLog) => (
        <span className="text-sm text-gray-600">
          {new Date(log.createdAt).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'actor',
      label: 'Actor',
      render: (log: AuditLog) => <span className="font-medium">{log.actor}</span>,
    },
    {
      key: 'action',
      label: 'Action',
      render: (log: AuditLog) => <span className="text-sm text-gray-900">{log.action}</span>,
    },
    {
      key: 'object',
      label: 'Object',
      render: (log: AuditLog) => <span className="text-sm text-gray-600">{log.object}</span>,
    },
    {
      key: 'meta',
      label: 'Details',
      render: (log: AuditLog) => (
        log.meta ? (
          <span className="text-xs text-gray-500">
            {JSON.stringify(log.meta).substring(0, 50)}...
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Audit Logs</h1>

      <FiltersBar
        filters={filters}
        onFilterChange={handleFilterChange}
        searchPlaceholder="Search audit logs..."
        customFilters={[
          {
            key: 'actor',
            label: 'Actor',
            type: 'text',
          },
          {
            key: 'action',
            label: 'Action',
            type: 'text',
          },
        ]}
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      <DatasetTable
        data={logs}
        columns={columns}
        loading={loading}
        page={page}
        pages={pages}
        total={total}
        onPageChange={setPage}
        emptyMessage="No audit logs found"
      />
    </div>
  );
}

