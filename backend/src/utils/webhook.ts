/**
 * Webhook Utilities
 * 
 * Signature verification and webhook processing helpers.
 */

import * as crypto from 'crypto';
import { Config } from '../config/Config';

/**
 * Verify Razorpay webhook signature
 * 
 * @param payload - Raw request body (string)
 * @param signature - X-Razorpay-Signature header value
 * @param secret - Razorpay webhook secret
 * @returns true if signature is valid
 */
export function verifyRazorpaySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Error verifying Razorpay signature:', error);
    return false;
  }
}

/**
 * Verify Razorpay payment signature
 * Used for payment verification (order_id|payment_id)
 */
export function verifyRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  try {
    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Error verifying Razorpay payment signature:', error);
    return false;
  }
}

/**
 * Generate idempotency key from webhook payload
 */
export function generateIdempotencyKey(payload: any): string {
  // Use payment_id or order_id if available, otherwise hash the payload
  if (payload.payment?.id) {
    return `razorpay_payment_${payload.payment.id}`;
  }
  if (payload.order?.id) {
    return `razorpay_order_${payload.order.id}`;
  }
  if (payload.id) {
    return `webhook_${payload.id}`;
  }
  
  // Fallback: hash the entire payload
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex')
    .substring(0, 32);
}

/**
 * Verify Delhivery webhook signature (if applicable)
 * Delhivery may use different signature methods - placeholder
 */
export function verifyDelhiverySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // TODO: Implement Delhivery signature verification when documentation is available
  // For now, return true if signature is provided (placeholder)
  return signature.length > 0;
}

