/**
 * Razorpay Signature Verification Test
 * 
 * Unit tests for webhook signature verification.
 */

import { verifyRazorpaySignature, verifyRazorpayPaymentSignature } from '../src/utils/webhook';
import * as crypto from 'crypto';

describe('Razorpay Signature Verification', () => {
  const secret = 'test_webhook_secret_key_12345';
  
  it('should verify valid webhook signature', () => {
    const payload = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_test123',
            amount: 10000,
          },
        },
      },
    });
    
    // Generate signature
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    // Verify
    const isValid = verifyRazorpaySignature(payload, signature, secret);
    expect(isValid).toBe(true);
  });
  
  it('should reject invalid webhook signature', () => {
    const payload = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_test123',
          },
        },
      },
    });
    
    const invalidSignature = 'invalid_signature_12345';
    
    const isValid = verifyRazorpaySignature(payload, invalidSignature, secret);
    expect(isValid).toBe(false);
  });
  
  it('should verify payment signature (order_id|payment_id)', () => {
    const orderId = 'order_test123';
    const paymentId = 'pay_test456';
    
    // Generate signature
    const payload = `${orderId}|${paymentId}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    // Verify
    const isValid = verifyRazorpayPaymentSignature(orderId, paymentId, signature, secret);
    expect(isValid).toBe(true);
  });
  
  it('should reject invalid payment signature', () => {
    const orderId = 'order_test123';
    const paymentId = 'pay_test456';
    const invalidSignature = 'invalid_signature';
    
    const isValid = verifyRazorpayPaymentSignature(orderId, paymentId, invalidSignature, secret);
    expect(isValid).toBe(false);
  });
  
  it('should handle empty payload', () => {
    const payload = '';
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    const isValid = verifyRazorpaySignature(payload, signature, secret);
    expect(isValid).toBe(true);
  });
  
  it('should handle special characters in payload', () => {
    const payload = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_test123',
            notes: {
              order_id: 'order_123',
              customer_name: 'John Doe & Co.',
            },
          },
        },
      },
    });
    
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    const isValid = verifyRazorpaySignature(payload, signature, secret);
    expect(isValid).toBe(true);
  });
});

