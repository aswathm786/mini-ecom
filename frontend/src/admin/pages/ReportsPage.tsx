/**
 * Admin Reports Page
 * 
 * Sales over time, top products, refunds summary, CSV export.
 */

import { useState } from 'react';
import { useReports } from '../hooks/useReports';
import { CSVExportButton } from '../components/CSVExportButton';
import { formatCurrency } from '../../lib/format';
import { Button } from '../../components/Button';

export function ReportsPage() {
  const { loading, error, salesReport, topProducts, refundsSummary, fetchSalesReport, fetchTopProducts, fetchRefundsSummary, exportCSV } = useReports();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const handleGenerateReports = () => {
    const params = {
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    };
    fetchSalesReport(params);
    fetchTopProducts(10);
    fetchRefundsSummary(params);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Reports</h1>

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Date Range</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="from-date" className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              id="from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label htmlFor="to-date" className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              id="to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-end">
            <Button variant="primary" onClick={handleGenerateReports} className="w-full">
              Generate Reports
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      {/* Sales Report */}
      {salesReport && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Sales Report</h2>
            <CSVExportButton
              onExport={() => exportCSV('sales', { fromDate, toDate })}
              label="Export Sales CSV"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Refunds</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {salesReport.map((row, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.orders}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(row.revenue)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.refunds}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Products */}
      {topProducts && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Top Products</h2>
            <CSVExportButton
              onExport={() => exportCSV('products')}
              label="Export Products CSV"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sales</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topProducts.map((product, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.sales}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(product.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Refunds Summary */}
      {refundsSummary && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Refunds Summary</h2>
            <CSVExportButton
              onExport={() => exportCSV('refunds', { fromDate, toDate })}
              label="Export Refunds CSV"
            />
          </div>
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Refunds</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">{refundsSummary.total}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(refundsSummary.amount)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">By Status</dt>
              <dd className="mt-1">
                {Object.entries(refundsSummary.byStatus).map(([status, count]) => (
                  <div key={status} className="text-sm text-gray-600">
                    {status}: {count as number}
                  </div>
                ))}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {loading && (
        <div className="text-center py-8 text-gray-500">Loading reports...</div>
      )}
    </div>
  );
}

