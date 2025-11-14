/**
 * Refund Models and DB Helpers
 * 
 * Type definitions and database operations for refunds.
 */

import { Db, ObjectId } from 'mongodb';
import { mongo } from '../db/Mongo';

export interface Refund {
  _id?: string;
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  initiatedBy: string; // userId
  status: 'requested' | 'processing' | 'succeeded' | 'failed';
  reason: string;
  gatewayRefundId?: string; // Razorpay refund ID
  gatewayResponse?: Record<string, any>;
  meta?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export class RefundModel {
  /**
   * Create a new refund record
   */
  static async create(refund: Omit<Refund, '_id' | 'createdAt' | 'updatedAt'>): Promise<Refund> {
    const db = mongo.getDb();
    const refundsCollection = db.collection<Refund>('refunds');
    
    const refundDoc: Refund = {
      ...refund,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await refundsCollection.insertOne(refundDoc);
    refundDoc._id = result.insertedId.toString();
    
    return refundDoc;
  }

  /**
   * Get refund by ID
   */
  static async getById(refundId: string): Promise<Refund | null> {
    const db = mongo.getDb();
    const refundsCollection = db.collection<Refund>('refunds');
    
    try {
      const refundObjId = new ObjectId(refundId);
      const refund = await refundsCollection.findOne({ _id: refundObjId });
      return refund;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get refunds for an order
   */
  static async getByOrderId(orderId: string): Promise<Refund[]> {
    const db = mongo.getDb();
    const refundsCollection = db.collection<Refund>('refunds');
    
    const refunds = await refundsCollection
      .find({ orderId })
      .sort({ createdAt: -1 })
      .toArray();
    
    return refunds;
  }

  /**
   * Get refunds for a payment
   */
  static async getByPaymentId(paymentId: string): Promise<Refund[]> {
    const db = mongo.getDb();
    const refundsCollection = db.collection<Refund>('refunds');
    
    const refunds = await refundsCollection
      .find({ paymentId })
      .sort({ createdAt: -1 })
      .toArray();
    
    return refunds;
  }

  /**
   * Update refund status
   */
  static async updateStatus(
    refundId: string,
    status: Refund['status'],
    gatewayRefundId?: string,
    gatewayResponse?: Record<string, any>
  ): Promise<boolean> {
    const db = mongo.getDb();
    const refundsCollection = db.collection<Refund>('refunds');
    
    try {
      const refundObjId = new ObjectId(refundId);
      const update: any = {
        status,
        updatedAt: new Date(),
      };
      
      if (gatewayRefundId) {
        update.gatewayRefundId = gatewayRefundId;
      }
      
      if (gatewayResponse) {
        update.gatewayResponse = gatewayResponse;
      }
      
      await refundsCollection.updateOne(
        { _id: refundObjId },
        { $set: update }
      );
      
      return true;
    } catch (error) {
      console.error('Error updating refund status:', error);
      return false;
    }
  }

  /**
   * Check if refund already exists for payment (idempotency)
   */
  static async findExistingRefund(
    paymentId: string,
    amount: number
  ): Promise<Refund | null> {
    const db = mongo.getDb();
    const refundsCollection = db.collection<Refund>('refunds');
    
    const refund = await refundsCollection.findOne({
      paymentId,
      amount,
      status: { $in: ['requested', 'processing', 'succeeded'] },
    });
    
    return refund;
  }
}

