/**
 * Delhivery Service
 * 
 * Integration with Delhivery shipping API.
 * Handles rate calculation, shipment creation, AWB generation, and tracking.
 */

import * as https from 'https';
import { Config } from '../config/Config';
import { mongo } from '../db/Mongo';
import { ObjectId } from 'mongodb';
import { saveFile } from '../utils/fileUtils';

export interface DelhiveryRate {
  recommended: boolean;
  charge: number;
  charge_before_tax: number;
  tax: number;
  etd: string;
  courier_company_id: number;
  courier_name: string;
}

export interface DelhiveryShipment {
  client_name: string;
  name: string;
  phone: string;
  add: string;
  pin: string;
  city: string;
  state: string;
  country: string;
  order: string; // Order ID
  payment_mode: string; // Prepaid or COD
  total_amount: number;
  shipment_width: number;
  shipment_height: number;
  shipment_length: number;
  weight: number;
}

export interface Shipment {
  _id?: string;
  orderId: string;
  awb?: string;
  service?: string;
  charge?: number;
  labelFilename?: string;
  pickupScheduled?: Date;
  status: 'pending' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed';
  events: Array<{
    status: string;
    timestamp: Date;
    location?: string;
    remarks?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

class DelhiveryService {
  private getToken(): string {
    return Config.get('DELHIVERY_TOKEN', '');
  }

  private getBaseUrl(): string {
    return Config.get('DELHIVERY_API_URL', 'https://track.delhivery.com/api');
  }

  /**
   * Make authenticated request to Delhivery API
   */
  private async makeRequest(
    method: string,
    path: string,
    data?: any
  ): Promise<any> {
    const token = this.getToken();
    
    if (!token) {
      throw new Error('Delhivery token not configured');
    }
    
    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}${path}`;
    const urlObj = new URL(url);
    
    const postData = data ? JSON.stringify(data) : undefined;
    
    return new Promise((resolve, reject) => {
      const options = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method,
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      };
      
      if (postData) {
        (options.headers as any)['Content-Length'] = Buffer.byteLength(postData);
      }
      
      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(`Delhivery API error: ${parsed.error || responseData}`));
            }
          } catch (error) {
            reject(new Error(`Failed to parse Delhivery response: ${responseData}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      if (postData) {
        req.write(postData);
      }
      
      req.end();
    });
  }

  /**
   * Get shipping rates
   */
  async getRates(
    pincodeFrom: string,
    pincodeTo: string,
    weight: number
  ): Promise<DelhiveryRate[]> {
    try {
      const response = await this.makeRequest('GET', `/kinko/v1/invoice/charges/.json`, {
        pin: pincodeTo,
        weight: weight.toString(),
      });
      
      return response || [];
    } catch (error) {
      console.error('Error getting Delhivery rates:', error);
      return [];
    }
  }

  /**
   * Create shipment
   */
  async createShipment(
    orderId: string,
    pickupDetails: DelhiveryShipment
  ): Promise<Shipment> {
    const db = mongo.getDb();
    const shipmentsCollection = db.collection<Shipment>('shipments');
    
    // Check if shipment already exists
    const existing = await shipmentsCollection.findOne({ orderId });
    if (existing) {
      return existing;
    }
    
    try {
      // Call Delhivery API to create shipment
      const response = await this.makeRequest('POST', '/cmu/create.json', {
        shipments: [pickupDetails],
      });
      
      const shipmentData = response.packages?.[0] || response;
      const awb = shipmentData.waybill || shipmentData.awb;
      
      // Create shipment record
      const shipment: Shipment = {
        orderId,
        awb,
        service: shipmentData.service_type,
        charge: shipmentData.charge,
        status: 'pending',
        events: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const result = await shipmentsCollection.insertOne(shipment);
      shipment._id = result.insertedId.toString();
      
      return shipment;
    } catch (error) {
      console.error('Error creating Delhivery shipment:', error);
      throw error;
    }
  }

  /**
   * Generate AWB label
   */
  async generateAWB(orderId: string): Promise<{ labelPath: string; labelUrl: string } | null> {
    const db = mongo.getDb();
    const shipmentsCollection = db.collection<Shipment>('shipments');
    
    const shipment = await shipmentsCollection.findOne({ orderId });
    if (!shipment || !shipment.awb) {
      throw new Error('Shipment or AWB not found');
    }
    
    try {
      // Call Delhivery API to get label
      const response = await this.makeRequest('GET', `/waybill/api/json/packages/json/`, {
        wbns: shipment.awb,
      });
      
      const labelData = response[shipment.awb];
      if (!labelData || !labelData.label) {
        throw new Error('Label not found in response');
      }
      
      // Save label PDF
      const labelBuffer = Buffer.from(labelData.label, 'base64');
      const labelFilename = `AWB_${shipment.awb}.pdf`;
      const labelPath = saveFile(labelFilename, labelBuffer, 'labels');
      
      // Update shipment record
      await shipmentsCollection.updateOne(
        { _id: new ObjectId(shipment._id) },
        {
          $set: {
            labelFilename,
            updatedAt: new Date(),
          },
        }
      );
      
      return {
        labelPath,
        labelUrl: `/api/uploads/labels/${labelFilename}`,
      };
    } catch (error) {
      console.error('Error generating AWB label:', error);
      throw error;
    }
  }

  /**
   * Track shipment
   */
  async track(awb: string): Promise<Shipment | null> {
    const db = mongo.getDb();
    const shipmentsCollection = db.collection<Shipment>('shipments');
    
    try {
      // Call Delhivery API to track
      const response = await this.makeRequest('GET', `/v1/packages/json/`, {
        waybill: awb,
      });
      
      const trackingData = response[awb];
      if (!trackingData) {
        return null;
      }
      
      // Update shipment record
      const shipment = await shipmentsCollection.findOne({ awb });
      if (shipment) {
        const events = trackingData.track?.map((event: any) => ({
          status: event.status,
          timestamp: new Date(event.time),
          location: event.location,
          remarks: event.remarks,
        })) || [];
        
        await shipmentsCollection.updateOne(
          { _id: new ObjectId(shipment._id) },
          {
            $set: {
              status: this.mapDelhiveryStatus(trackingData.status),
              events,
              updatedAt: new Date(),
            },
          }
        );
        
        return await shipmentsCollection.findOne({ awb });
      }
      
      return null;
    } catch (error) {
      console.error('Error tracking shipment:', error);
      return null;
    }
  }

  /**
   * Map Delhivery status to internal status
   */
  private mapDelhiveryStatus(delhiveryStatus: string): Shipment['status'] {
    const statusMap: Record<string, Shipment['status']> = {
      'Pending': 'pending',
      'Picked': 'picked_up',
      'In Transit': 'in_transit',
      'Out for Delivery': 'out_for_delivery',
      'Delivered': 'delivered',
      'Failed': 'failed',
    };
    
    return statusMap[delhiveryStatus] || 'pending';
  }

  /**
   * Get shipment by order ID
   */
  async getShipmentByOrderId(orderId: string): Promise<Shipment | null> {
    const db = mongo.getDb();
    const shipmentsCollection = db.collection<Shipment>('shipments');
    
    const shipment = await shipmentsCollection.findOne({ orderId });
    return shipment;
  }
}

export const delhiveryService = new DelhiveryService();

