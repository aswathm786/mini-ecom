/**
 * Admin Database Schema Page
 * 
 * View and manage database schema, collections, and indexes.
 */

import { useState, useEffect } from 'react';
import { useAdminApi } from '../hooks/useAdminApi';
import { Button } from '../../components/Button';
import { ToastContainer } from '../../components/Toast';
import { ConfirmAction } from '../components/ConfirmAction';

interface CollectionInfo {
  name: string;
  count: number;
  size: number;
  indexes: Array<{
    name: string;
    keys: Record<string, number>;
    unique?: boolean;
    sparse?: boolean;
    expireAfterSeconds?: number;
  }>;
}

interface CollectionDetails {
  name: string;
  count: number;
  size: number;
  storageSize: number;
  indexes: Array<{
    name: string;
    keys: Record<string, number>;
    unique?: boolean;
    sparse?: boolean;
    expireAfterSeconds?: number;
  }>;
  fieldTypes: Record<string, string>;
  sampleDocuments: any[];
}

export function SchemaPage() {
  const api = useAdminApi();
  const [collections, setCollections] = useState<CollectionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [collectionDetails, setCollectionDetails] = useState<CollectionDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }>>([]);
  const [showInitConfirm, setShowInitConfirm] = useState(false);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    loadSchema();
  }, []);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const toastId = Date.now().toString();
    setToasts((prev) => [...prev, { id: toastId, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const loadSchema = async () => {
    setLoading(true);
    try {
      const data = await api.get<CollectionInfo[]>('/schema');
      setCollections(data);
    } catch (error) {
      addToast('Failed to load schema', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCollectionDetails = async (collectionName: string) => {
    setLoadingDetails(true);
    setSelectedCollection(collectionName);
    try {
      const data = await api.get<CollectionDetails>(`/schema/${collectionName}`);
      setCollectionDetails(data);
    } catch (error) {
      addToast('Failed to load collection details', 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleInitSchema = async () => {
    setInitializing(true);
    try {
      const result = await api.post('/schema/init', {});
      addToast('Schema initialized successfully', 'success');
      await loadSchema();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to initialize schema', 'error');
    } finally {
      setInitializing(false);
      setShowInitConfirm(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatIndexKeys = (keys: Record<string, number>): string => {
    return Object.entries(keys)
      .map(([key, value]) => `${key}(${value === 1 ? 'asc' : value === -1 ? 'desc' : 'text'})`)
      .join(', ');
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
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Database Schema</h1>
        <Button variant="primary" onClick={() => setShowInitConfirm(true)}>
          Initialize Schema
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Collections List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Collections ({collections.length})</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {collections.map((collection) => (
                <button
                  key={collection.name}
                  onClick={() => loadCollectionDetails(collection.name)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                    selectedCollection === collection.name
                      ? 'bg-primary-100 text-primary-900'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{collection.name}</span>
                    <span className="text-xs text-gray-500">{collection.count}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatBytes(collection.size)} • {collection.indexes.length} indexes
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Collection Details */}
        <div className="lg:col-span-2">
          {loadingDetails ? (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          ) : collectionDetails ? (
            <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{collectionDetails.name}</h2>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Documents:</span>
                    <span className="ml-2 font-medium">{collectionDetails.count.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Size:</span>
                    <span className="ml-2 font-medium">{formatBytes(collectionDetails.size)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Storage:</span>
                    <span className="ml-2 font-medium">{formatBytes(collectionDetails.storageSize)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Indexes ({collectionDetails.indexes.length})</h3>
                <div className="space-y-2">
                  {collectionDetails.indexes.map((index) => (
                    <div key={index.name} className="border border-gray-200 rounded-md p-3">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-sm font-mono text-gray-900">{index.name}</code>
                        <div className="flex gap-2">
                          {index.unique && (
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">Unique</span>
                          )}
                          {index.sparse && (
                            <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">Sparse</span>
                          )}
                          {index.expireAfterSeconds !== undefined && (
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                              TTL: {index.expireAfterSeconds}s
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <strong>Keys:</strong> {formatIndexKeys(index.keys)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Field Types</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(collectionDetails.fieldTypes).map(([field, type]) => (
                    <div key={field} className="text-sm">
                      <code className="text-gray-900">{field}</code>
                      <span className="text-gray-500 ml-2">({type})</span>
                    </div>
                  ))}
                </div>
              </div>

              {collectionDetails.sampleDocuments.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Sample Documents</h3>
                  <div className="bg-gray-50 rounded-md p-4 overflow-x-auto">
                    <pre className="text-xs text-gray-700">
                      {JSON.stringify(collectionDetails.sampleDocuments, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-500">Select a collection to view details</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmAction
        isOpen={showInitConfirm}
        title="Initialize Database Schema"
        message="This will create all collections and indexes if they don't exist. This operation is safe to run multiple times. Continue?"
        confirmText="Initialize"
        onConfirm={handleInitSchema}
        onCancel={() => setShowInitConfirm(false)}
        variant="info"
        isLoading={initializing}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

