/**
 * Webhook Controller
 * 
 * Handles incoming webhooks from external services (Razorpay, Delhivery, etc.).
 * Verifies signatures, stores events, and enqueues jobs for processing.
 */

import { Request, Response } from 'express';
import { mongo } from '../db/Mongo';
import { WebhookEvent } from '../types';
import { verifyRazorpaySignature, verifyDelhiverySignature, generateIdempotencyKey } from '../utils/webhook';
import { Config } from '../config/Config';
import { ObjectId } from 'mongodb';
import { settingsService } from '../services/SettingsService';

export interface Job {
  _id?: string;
  type: 'webhook.process' | 'email.send' | 'refund.process' | 'shipment.create' | 'tracking.sync';
  payload: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
}

export class WebhookController {
  /**
   * POST /api/webhook/razorpay
   * Handle Razorpay webhook events
   * Verifies signature, stores event, and enqueues job for processing
   */
  static async razorpay(req: Request, res: Response): Promise<void> {
    try {
      const db = mongo.getDb();
      const webhookEventsCollection = db.collection<WebhookEvent>('webhook_events');
      const jobsCollection = db.collection<Job>('jobs');

      // Get raw body (should be string for signature verification)
      const rawBody = JSON.stringify(req.body);
      const signature = req.headers['x-razorpay-signature'] as string;

      // Verify signature
      const webhookSecret = Config.get('RAZORPAY_WEBHOOK_SECRET', '');
      let signatureValid = false;

      if (webhookSecret && signature) {
        signatureValid = verifyRazorpaySignature(rawBody, signature, webhookSecret);
      } else {
        // If secret not configured, log warning but continue
        console.warn('Razorpay webhook secret not configured, skipping signature verification');
        signatureValid = true; // Allow processing if secret not set
      }

      // Generate idempotency key
      const idempotencyKey = generateIdempotencyKey(req.body);

      // Check if event already processed (idempotency)
      const existing = await webhookEventsCollection.findOne({
        'payload.payment.id': req.body.payload?.payment?.id,
        processed: true,
      });

      if (existing) {
        console.log('Duplicate webhook event, ignoring');
        return res.status(200).json({
          ok: true,
          message: 'Event already processed',
        });
      }

      // Store webhook event
      const event: WebhookEvent = {
        source: 'razorpay',
        eventType: req.body.event || 'unknown',
        payload: req.body,
        signature: signature || undefined,
        signatureValid,
        headers: req.headers as Record<string, string>,
        idempotencyKey,
        processed: false,
        createdAt: new Date(),
      };

      const result = await webhookEventsCollection.insertOne(event);

      // Enqueue job for processing
      const job: Job = {
        type: 'webhook.process',
        payload: {
          webhookEventId: result.insertedId.toString(),
          source: 'razorpay',
          eventType: event.eventType,
        },
        status: 'pending',
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await jobsCollection.insertOne(job);

      console.log(`Webhook event stored and queued: ${result.insertedId} (${event.eventType})`);

      res.status(200).json({
        ok: true,
        message: 'Webhook received',
        eventId: result.insertedId.toString(),
        signatureValid,
      });
    } catch (error) {
      console.error('Webhook processing error:', error);

      // Return 200 to acknowledge receipt (prevent Razorpay retries)
      res.status(200).json({
        ok: false,
        error: 'Webhook processing failed',
      });
    }
  }

  /**
   * POST /api/webhook/delhivery
   * Handle Delhivery webhook events
   */
  static async delhivery(req: Request, res: Response): Promise<void> {
    try {
      // Check if Delhivery is enabled
      const { settingsService } = await import('../services/SettingsService');
      const shipping = await settingsService.getSetting('shipping');
      if (!shipping?.providers?.delhivery?.enabled) {
        // Return 410 Gone if provider is disabled
        res.status(410).json({
          ok: false,
          error: 'Delhivery webhooks are disabled',
        });
        return;
      }


      const db = mongo.getDb();
      const webhookEventsCollection = db.collection<WebhookEvent>('webhook_events');
      const jobsCollection = db.collection<Job>('jobs');

      const rawBody = JSON.stringify(req.body);
      const signature = req.headers['x-delhivery-signature'] as string || '';

      // Verify signature (placeholder - implement when Delhivery docs available)
      const webhookSecret = Config.get('DELHIVERY_WEBHOOK_SECRET', '');
      let signatureValid = false;

      if (webhookSecret && signature) {
        signatureValid = verifyDelhiverySignature(rawBody, signature, webhookSecret);
      } else {
        signatureValid = true; // Allow if secret not configured
      }

      // Generate idempotency key
      const idempotencyKey = generateIdempotencyKey(req.body);

      // Store webhook event
      const event: WebhookEvent = {
        source: 'delhivery',
        eventType: req.body.event || req.body.status || 'unknown',
        payload: req.body,
        signature: signature || undefined,
        signatureValid,
        headers: req.headers as Record<string, string>,
        idempotencyKey,
        processed: false,
        createdAt: new Date(),
      };

      const result = await webhookEventsCollection.insertOne(event);

      // Enqueue job for processing
      const job: Job = {
        type: 'webhook.process',
        payload: {
          webhookEventId: result.insertedId.toString(),
          source: 'delhivery',
          eventType: event.eventType,
        },
        status: 'pending',
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await jobsCollection.insertOne(job);

      console.log(`Delhivery webhook event stored and queued: ${result.insertedId}`);

      res.status(200).json({
        ok: true,
        message: 'Webhook received',
        eventId: result.insertedId.toString(),
      });
    } catch (error) {
      console.error('Delhivery webhook processing error:', error);
      res.status(200).json({
        ok: false,
        error: 'Webhook processing failed',
      });
    }
  }
}

