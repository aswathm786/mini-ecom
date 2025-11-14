/**
 * Tracking Timeline Component
 * 
 * Displays shipment tracking events in a timeline format.
 */

interface TrackingEvent {
  status: string;
  location?: string;
  timestamp: string;
  details?: string;
}

interface TrackingTimelineProps {
  events: TrackingEvent[];
  currentStatus?: string;
}

export function TrackingTimeline({ events, currentStatus }: TrackingTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No tracking information available</p>
      </div>
    );
  }

  // Sort events by timestamp (newest first)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
      <div className="space-y-6">
        {sortedEvents.map((event, index) => {
          const isLatest = index === 0;
          const isActive = isLatest && currentStatus === event.status;

          return (
            <div key={index} className="relative flex items-start">
              <div
                className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                  isActive
                    ? 'bg-primary-600 border-primary-600'
                    : 'bg-white border-gray-300'
                }`}
              >
                {isActive && (
                  <div className="w-3 h-3 rounded-full bg-white"></div>
                )}
              </div>
              <div className="ml-4 flex-1 pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${isActive ? 'text-primary-600' : 'text-gray-900'}`}>
                      {event.status}
                    </p>
                    {event.location && (
                      <p className="text-sm text-gray-600 mt-1">{event.location}</p>
                    )}
                    {event.details && (
                      <p className="text-sm text-gray-500 mt-1">{event.details}</p>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(event.timestamp).toLocaleString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

