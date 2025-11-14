/**
 * Jobs Worker CLI
 * 
 * Processes queued jobs from the jobs collection.
 * Handles webhook processing, email sending, refunds, shipments, and tracking sync.
 * 
 * Usage:
 *   ts-node cli/jobs_worker.ts
 *   or
 *   node dist/cli/jobs_worker.js
 */

import { mongo } from '../db/Mongo';
import { ObjectId } from 'mongodb';
import { razorpayService } from '../services/RazorpayService';
import { RefundModel } from '../models/refunds';
import { mailService } from '../services/MailService';
import { delhiveryService } from '../services/DelhiveryService';
import { invoiceService } from '../services/InvoiceService';

interface Job {
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

class JobsWorker {
  private running = false;
  private interval: NodeJS.Timeout | null = null;

  /**
   * Process a single job
   */
  private async processJob(job: Job): Promise<boolean> {
    const db = mongo.getDb();
    const jobsCollection = db.collection<Job>('jobs');
    const webhookEventsCollection = db.collection('webhook_events');
    const ordersCollection = db.collection('orders');
    const paymentsCollection = db.collection('payments');
    
    try {
      // Mark job as processing
      await jobsCollection.updateOne(
        { _id: new ObjectId(job._id) },
        {
          $set: {
            status: 'processing',
            updatedAt: new Date(),
          },
        }
      );
      
      let success = false;
      
      switch (job.type) {
        case 'webhook.process':
          success = await this.processWebhook(job.payload);
          break;
        
        case 'email.send':
          success = await this.processEmail(job.payload);
          break;
        
        case 'refund.process':
          success = await this.processRefund(job.payload);
          break;
        
        case 'shipment.create':
          success = await this.processShipment(job.payload);
          break;
        
        case 'tracking.sync':
          success = await this.processTracking(job.payload);
          break;
        
        default:
          console.error(`Unknown job type: ${job.type}`);
          success = false;
      }
      
      if (success) {
        // Mark job as completed
        await jobsCollection.updateOne(
          { _id: new ObjectId(job._id) },
          {
            $set: {
              status: 'completed',
              processedAt: new Date(),
              updatedAt: new Date(),
            },
          }
        );
        return true;
      } else {
        throw new Error('Job processing failed');
      }
    } catch (error) {
      console.error(`Error processing job ${job._id}:`, error);
      
      const newAttempts = job.attempts + 1;
      const shouldRetry = newAttempts < job.maxAttempts;
      
      await jobsCollection.updateOne(
        { _id: new ObjectId(job._id) },
        {
          $set: {
            status: shouldRetry ? 'pending' : 'failed',
            attempts: newAttempts,
            error: error instanceof Error ? error.message : 'Unknown error',
            updatedAt: new Date(),
          },
        }
      );
      
      return false;
    }
  }

  /**
   * Process webhook event
   */
  private async processWebhook(payload: any): Promise<boolean> {
    const db = mongo.getDb();
    const webhookEventsCollection = db.collection('webhook_events');
    const ordersCollection = db.collection('orders');
    const paymentsCollection = db.collection('payments');
    
    const event = await webhookEventsCollection.findOne({
      _id: new ObjectId(payload.webhookEventId),
    });
    
    if (!event) {
      return false;
    }
    
    // Process Razorpay webhook
    if (event.source === 'razorpay') {
      if (event.eventType === 'payment.captured') {
        const paymentId = event.payload.payload?.payment?.entity?.id;
        if (paymentId) {
          await paymentsCollection.updateOne(
            { gateway_payment_id: paymentId },
            {
              $set: {
                status: 'completed',
                updatedAt: new Date(),
              },
            }
          );
        }
      } else if (event.eventType === 'payment.failed') {
        const paymentId = event.payload.payload?.payment?.entity?.id;
        if (paymentId) {
          await paymentsCollection.updateOne(
            { gateway_payment_id: paymentId },
            {
              $set: {
                status: 'failed',
                updatedAt: new Date(),
              },
            }
          );
        }
      }
    }
    
    // Mark event as processed
    await webhookEventsCollection.updateOne(
      { _id: new ObjectId(event._id) },
      {
        $set: {
          processed: true,
        },
      }
    );
    
    return true;
  }

  /**
   * Process email job
   */
  private async processEmail(payload: any): Promise<boolean> {
    const result = await mailService.sendEmail({
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      attachments: payload.attachments,
    });
    
    return result.success;
  }

  /**
   * Process refund job
   */
  private async processRefund(payload: any): Promise<boolean> {
    const refund = await RefundModel.getById(payload.refundId);
    if (!refund) {
      return false;
    }
    
    try {
      const razorpayRefund = await razorpayService.createRefund({
        paymentId: payload.paymentId,
        amount: refund.amount,
        notes: {
          reason: refund.reason,
          orderId: refund.orderId,
        },
      });
      
      await RefundModel.updateStatus(
        refund._id!,
        'succeeded',
        razorpayRefund.id,
        razorpayRefund
      );
      
      return true;
    } catch (error) {
      await RefundModel.updateStatus(
        refund._id!,
        'failed',
        undefined,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      return false;
    }
  }

  /**
   * Process shipment creation
   */
  private async processShipment(payload: any): Promise<boolean> {
    try {
      await delhiveryService.createShipment(payload.orderId, payload.pickupDetails);
      return true;
    } catch (error) {
      console.error('Error creating shipment:', error);
      return false;
    }
  }

  /**
   * Process tracking sync
   */
  private async processTracking(payload: any): Promise<boolean> {
    try {
      await delhiveryService.track(payload.awb);
      return true;
    } catch (error) {
      console.error('Error syncing tracking:', error);
      return false;
    }
  }

  /**
   * Process pending jobs
   */
  private async processPendingJobs(): Promise<void> {
    const db = mongo.getDb();
    const jobsCollection = db.collection<Job>('jobs');
    
    // Get pending jobs (limit to 10 at a time)
    const jobs = await jobsCollection
      .find({
        status: 'pending',
        attempts: { $lt: 3 }, // Max 3 attempts
      })
      .sort({ createdAt: 1 })
      .limit(10)
      .toArray();
    
    for (const job of jobs) {
      await this.processJob(job);
    }
  }

  /**
   * Start worker
   */
  async start(intervalMs: number = 5000): Promise<void> {
    if (this.running) {
      console.log('Worker already running');
      return;
    }
    
    this.running = true;
    console.log('Jobs worker started');
    
    // Process immediately
    await this.processPendingJobs();
    
    // Then process every interval
    this.interval = setInterval(async () => {
      await this.processPendingJobs();
    }, intervalMs);
  }

  /**
   * Stop worker
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.running = false;
    console.log('Jobs worker stopped');
  }
}

// CLI entry point
async function main() {
  try {
    // Connect to MongoDB
    await mongo.connect();
    console.log('Connected to MongoDB');
    
    const worker = new JobsWorker();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nShutting down...');
      worker.stop();
      mongo.close().then(() => {
        process.exit(0);
      });
    });
    
    // Start worker (process every 5 seconds)
    await worker.start(5000);
  } catch (error) {
    console.error('Error starting jobs worker:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { JobsWorker };

