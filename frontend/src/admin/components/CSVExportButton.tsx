/**
 * CSV Export Button Component
 * 
 * Button to export data as CSV.
 */

import { useState } from 'react';
import { Button } from '../../components/Button';

interface CSVExportButtonProps {
  onExport: () => Promise<void>;
  label?: string;
  filename?: string;
}

export function CSVExportButton({ onExport, label = 'Export CSV', filename }: CSVExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await onExport();
    } catch (error) {
      console.error('Export failed:', error);
      // TODO: Show error toast
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      isLoading={exporting}
      disabled={exporting}
    >
      <svg
        className="w-5 h-5 inline-block mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      {label}
    </Button>
  );
}

