/**
 * Shipment Dialog Component
 * 
 * Modal for creating shipments with service type and dimensions.
 */

import { useState } from 'react';
import { Button } from '../../components/Button';

interface ShipmentDialogProps {
  isOpen: boolean;
  orderId: string;
  onClose: () => void;
  onConfirm: (data: {
    serviceType?: string;
    weight?: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
  }) => void;
}

export function ShipmentDialog({ isOpen, orderId, onClose, onConfirm }: ShipmentDialogProps) {
  const [serviceType, setServiceType] = useState('standard');
  const [weight, setWeight] = useState('');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const shipmentData: any = {
      orderId,
      serviceType,
    };

    if (weight) {
      shipmentData.weight = parseFloat(weight);
    }

    if (length && width && height) {
      shipmentData.dimensions = {
        length: parseFloat(length),
        width: parseFloat(width),
        height: parseFloat(height),
      };
    }

    onConfirm(shipmentData);
    setServiceType('standard');
    setWeight('');
    setLength('');
    setWidth('');
    setHeight('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4" id="modal-title">
                Create Shipment
              </h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="service-type" className="block text-sm font-medium text-gray-700 mb-1">
                    Service Type
                  </label>
                  <select
                    id="service-type"
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="standard">Standard</option>
                    <option value="express">Express</option>
                    <option value="cod">COD</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
                    Weight (kg)
                  </label>
                  <input
                    id="weight"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dimensions (cm) - Optional</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={length}
                        onChange={(e) => setLength(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Length"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Width"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Height"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <Button type="submit" variant="primary" className="sm:ml-3 sm:w-auto">
                Create Shipment
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="mt-3 sm:mt-0 sm:w-auto"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

