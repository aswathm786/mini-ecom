/**
 * Razorpay Service
 * 
 * Wrapper for Razorpay Orders API, Payments API, and Refunds API.
 * Uses keys from Config/settings collection.
 */

import * as https from 'https';
import { Config } from '../config/Config';
import { platformSettingsService } from './PlatformSettingsService';

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status: string;
  created_at: number;
}

export interface RazorpayPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  created_at: number;
}

export interface RazorpayRefund {
  id: string;
  payment_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: number;
}

class RazorpayService {
  /**
   * Check if Razorpay is enabled
   */
  private async isEnabled(): Promise<boolean> {
    try {
      const settings = await platformSettingsService.getSettings();
      const payments = (settings as any).payments;
      if (payments && payments.methods && payments.methods.razorpay) {
        return payments.methods.razorpay.enabled === true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private getKeyId(): string {
    return Config.get('RAZORPAY_KEY_ID', '');
  }

  private getKeySecret(): string {
    return Config.get('RAZORPAY_KEY_SECRET', '');
  }

  private getBaseUrl(): string {
    const mode = Config.get('razorpay.mode', 'test');
    return mode === 'live'
      ? 'https://api.razorpay.com/v1'
      : 'https://api.razorpay.com/v1';
  }

  /**
   * Make authenticated request to Razorpay API
   */
  private async makeRequest(
    method: string,
    path: string,
    data?: any
  ): Promise<any> {
    // Check if Razorpay is enabled
    const isEnabled = await this.isEnabled();
    if (!isEnabled) {
      throw new Error('Razorpay is not enabled. Please enable it in admin settings.');
    }

    const keyId = this.getKeyId();
    const keySecret = this.getKeySecret();
    
    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials not configured. Please add Key ID and Key Secret in admin settings.');
    }
    
    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}${path}`;
    const urlObj = new URL(url);
    
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    
    const postData = data ? JSON.stringify(data) : undefined;
    
    return new Promise((resolve, reject) => {
      const options = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method,
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'User-Agent': 'HandmadeHarmony/1.0',
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
              reject(new Error(`Razorpay API error: ${parsed.error?.description || responseData}`));
            }
          } catch (error) {
            reject(new Error(`Failed to parse Razorpay response: ${responseData}`));
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
   * Create Razorpay order
   */
  async createOrder(params: {
    amount: number;
    currency?: string;
    receipt?: string;
    notes?: Record<string, any>;
  }): Promise<RazorpayOrder> {
    const orderData = {
      amount: params.amount * 100, // Convert to paise
      currency: params.currency || 'INR',
      receipt: params.receipt,
      notes: params.notes || {},
    };
    
    return await this.makeRequest('POST', '/orders', orderData);
  }

  /**
   * Get order details
   */
  async getOrder(orderId: string): Promise<RazorpayOrder> {
    return await this.makeRequest('GET', `/orders/${orderId}`);
  }

  /**
   * Capture payment
   */
  async capturePayment(
    paymentId: string,
    amount: number
  ): Promise<RazorpayPayment> {
    return await this.makeRequest('POST', `/payments/${paymentId}/capture`, {
      amount: amount * 100, // Convert to paise
    });
  }

  /**
   * Get payment details
   */
  async getPayment(paymentId: string): Promise<RazorpayPayment> {
    return await this.makeRequest('GET', `/payments/${paymentId}`);
  }

  /**
   * Create refund
   */
  async createRefund(params: {
    paymentId: string;
    amount?: number; // If not provided, full refund
    notes?: Record<string, any>;
  }): Promise<RazorpayRefund> {
    const refundData: any = {
      notes: params.notes || {},
    };
    
    if (params.amount) {
      refundData.amount = params.amount * 100; // Convert to paise
    }
    
    return await this.makeRequest(
      'POST',
      `/payments/${params.paymentId}/refund`,
      refundData
    );
  }

  /**
   * Get refund details
   */
  async getRefund(refundId: string): Promise<RazorpayRefund> {
    return await this.makeRequest('GET', `/refunds/${refundId}`);
  }

  /**
   * Get all refunds for a payment
   */
  async getRefunds(paymentId: string): Promise<RazorpayRefund[]> {
    const response = await this.makeRequest('GET', `/payments/${paymentId}/refund`);
    return response.items || [];
  }

  /**
   * Test Razorpay credentials by creating a minimal test order
   * This verifies that the key_id and key_secret are valid
   */
  async testCredentials(keyId: string, keySecret: string): Promise<boolean> {
    try {
      const baseUrl = 'https://api.razorpay.com/v1';
      const url = `${baseUrl}/orders`;
      const urlObj = new URL(url);
      
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      
      const testOrderData = {
        amount: 100, // 1 rupee in paise (minimum amount)
        currency: 'INR',
        receipt: `test_${Date.now()}`,
        notes: {
          test: true,
        },
      };
      
      const postData = JSON.stringify(testOrderData);
      
      return new Promise((resolve, reject) => {
        const options = {
          hostname: urlObj.hostname,
          port: 443,
          path: urlObj.pathname,
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'User-Agent': 'HandmadeHarmony/1.0',
          },
        };
        
        const req = https.request(options, (res) => {
          let responseData = '';
          
          res.on('data', (chunk) => {
            responseData += chunk;
          });
          
          res.on('end', () => {
            try {
              const parsed = JSON.parse(responseData);
              
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                // Order created successfully, credentials are valid
                resolve(true);
              } else {
                // Invalid credentials or other error
                resolve(false);
              }
            } catch (error) {
              resolve(false);
            }
          });
        });
        
        req.on('error', () => {
          resolve(false);
        });
        
        req.write(postData);
        req.end();
      });
    } catch (error) {
      return false;
    }
  }
}

export const razorpayService = new RazorpayService();

