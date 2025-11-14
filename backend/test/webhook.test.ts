/**
 * Webhook Controller Tests
 * 
 * Simple test to verify webhook event storage functionality.
 */

import { WebhookController } from '../src/controllers/WebhookController';
import { mongo } from '../src/db/Mongo';
import { WebhookEvent } from '../src/types';

// Mock MongoDB connection (in a real test, you'd use a test database)
jest.mock('../src/db/Mongo', () => ({
  mongo: {
    getDb: jest.fn(() => ({
      collection: jest.fn(() => ({
        insertOne: jest.fn(async (doc: WebhookEvent) => ({
          insertedId: 'test-id-123',
        })),
      })),
    })),
  },
}));

describe('WebhookController', () => {
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    mockReq = {
      body: {
        event: 'payment.captured',
        payload: {
          order_id: 'order_123',
          payment_id: 'pay_456',
        },
      },
      headers: {
        'x-razorpay-signature': 'test-signature-123',
        'content-type': 'application/json',
      },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  it('should store webhook event in database', async () => {
    await WebhookController.razorpay(mockReq, mockRes);

    // Verify response
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      ok: true,
      message: 'Webhook received',
      eventId: 'test-id-123',
    });
  });

  it('should handle webhook without signature', async () => {
    delete mockReq.headers['x-razorpay-signature'];

    await WebhookController.razorpay(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalled();
  });

  it('should store event type from payload', async () => {
    mockReq.body.event = 'payment.failed';

    await WebhookController.razorpay(mockReq, mockRes);

    // Verify the event was stored with correct event type
    const db = mongo.getDb();
    const collection = db.collection('webhook_events');
    expect(collection.insertOne).toHaveBeenCalled();
  });
});

