import { Request, Response } from 'express';
import { mongo } from '../db/Mongo';
import { parsePagination } from '../helpers/pagination';
import { ObjectId } from 'mongodb';

type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export class AdminWebhookController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const pagination = parsePagination(req.query);
      const db = mongo.getDb();
      const eventsCollection = db.collection('webhook_events');

      const matchStage: Record<string, any> = {};
      if (req.query.source) {
        matchStage.source = req.query.source;
      }
      if (req.query.event_type) {
        matchStage.eventType = { $regex: req.query.event_type, $options: 'i' };
      }

      const lookupStage = {
        $lookup: {
          from: 'jobs',
          let: { eventId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$payload.webhookEventId', '$$eventId'],
                },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
          ],
          as: 'job',
        },
      };

      const addFieldsStage = {
        $addFields: {
          job: { $arrayElemAt: ['$job', 0] },
        },
      };

      const statusStage = {
        $addFields: {
          status: {
            $cond: [
              { $eq: ['$job.status', 'failed'] },
              'failed',
              {
                $cond: [{ $eq: ['$processed', true] }, 'processed', 'pending'],
              },
            ],
          },
          attempts: { $ifNull: ['$job.attempts', 0] },
          last_error: '$job.error',
        },
      };

      const basePipeline = [{ $match: matchStage }, lookupStage, addFieldsStage, statusStage];

      const filteredPipeline =
        req.query.status && typeof req.query.status === 'string'
          ? [...basePipeline, { $match: { status: req.query.status } }]
          : basePipeline;

      const totalPipeline = [...filteredPipeline, { $count: 'count' }];
      const totalResult = await eventsCollection.aggregate(totalPipeline).toArray();
      const total = totalResult[0]?.count || 0;

      const dataPipeline = [
        ...filteredPipeline,
        { $sort: { createdAt: -1 } },
        { $skip: pagination.skip },
        { $limit: pagination.limit },
      ];

      const events = await eventsCollection.aggregate(dataPipeline).toArray();

      const items = events.map((event) => ({
        _id: event._id?.toString() || '',
        event_type: event.eventType,
        source: event.source,
        payload: event.payload,
        status: event.status as JobStatus | 'pending' | 'processed',
        attempts: event.attempts ?? 0,
        last_error: event.last_error ?? null,
        signatureValid: event.signatureValid ?? false,
        createdAt: event.createdAt,
        processedAt: event.processedAt,
      }));

      res.json({
        ok: true,
        data: {
          items,
          total,
          pages: Math.ceil(total / pagination.limit) || 0,
        },
      });
    } catch (error) {
      console.error('Failed to load webhook events', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to load webhook events',
      });
    }
  }

  static async get(req: Request, res: Response): Promise<void> {
    try {
      const db = mongo.getDb();
      const eventsCollection = db.collection('webhook_events');
      const jobsCollection = db.collection('jobs');
      const _id = new ObjectId(req.params.id);

      const event = await eventsCollection.findOne({ _id });
      if (!event) {
        res.status(404).json({ ok: false, error: 'Webhook event not found' });
        return;
      }

      const job = await jobsCollection
        .find({ 'payload.webhookEventId': req.params.id })
        .sort({ createdAt: -1 })
        .limit(1)
        .next();

      res.json({
        ok: true,
        data: {
          _id: event._id?.toString(),
          event_type: event.eventType,
          source: event.source,
          payload: event.payload,
          status: job?.status === 'failed' ? 'failed' : event.processed ? 'processed' : 'pending',
          attempts: job?.attempts ?? 0,
          last_error: job?.error ?? null,
          createdAt: event.createdAt,
          processedAt: event.processedAt,
        },
      });
    } catch (error) {
      console.error('Failed to fetch webhook event', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch webhook event',
      });
    }
  }

  static async retry(req: Request, res: Response): Promise<void> {
    try {
      const db = mongo.getDb();
      const eventsCollection = db.collection('webhook_events');
      const jobsCollection = db.collection('jobs');
      const _id = new ObjectId(req.params.id);

      const event = await eventsCollection.findOne({ _id });
      if (!event) {
        res.status(404).json({ ok: false, error: 'Webhook event not found' });
        return;
      }

      await jobsCollection.insertOne({
        type: 'webhook.process',
        payload: {
          webhookEventId: req.params.id,
          source: event.source,
          eventType: event.eventType,
        },
        status: 'pending',
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await eventsCollection.updateOne(
        { _id },
        {
          $set: {
            processed: false,
            lastRetryAt: new Date(),
          },
        }
      );

      res.json({
        ok: true,
        message: 'Webhook event queued for retry',
      });
    } catch (error) {
      console.error('Failed to queue webhook retry', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to retry webhook event',
      });
    }
  }
}


