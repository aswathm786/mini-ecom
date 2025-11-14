/**
 * Tracking Page
 * 
 * Display shipment tracking timeline.
 */

import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { csrfFetch } from '../../lib/csrfFetch';
import { TrackingTimeline } from '../../components/Tracking/TrackingTimeline';

interface TrackingEvent {
  status: string;
  location?: string;
  timestamp: string;
  details?: string;
}

interface TrackingData {
  awb: string;
  events: TrackingEvent[];
  current_status?: string;
}

export function TrackingPage() {
  const { awb } = useParams<{ awb: string }>();
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (awb) {
      loadTracking();
    }
  }, [awb]);

  const loadTracking = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await csrfFetch(`/api/shipments/${awb}/track`);
      if (response.ok && response.data) {
        setTracking(response.data);
      } else {
        setError(response.error || 'Tracking information not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !tracking) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">{error || 'Tracking information not found'}</p>
          <Link to="/account/orders" className="mt-4 inline-block text-primary-600 hover:underline">
            ← Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/account/orders" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
        ← Back to Orders
      </Link>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Shipment Tracking</h1>
        <p className="text-gray-600">AWB Number: <span className="font-mono font-semibold">{tracking.awb}</span></p>
        {tracking.current_status && (
          <p className="text-sm text-gray-600 mt-2">
            Current Status: <span className="font-medium">{tracking.current_status}</span>
          </p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <TrackingTimeline events={tracking.events} currentStatus={tracking.current_status} />
      </div>
    </div>
  );
}

