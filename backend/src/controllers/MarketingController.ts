import { Request, Response } from 'express';
import { z } from 'zod';
import { mongo } from '../db/Mongo';

const stringOrEmpty = z
  .string()
  .optional()
  .transform((value) => (value === undefined ? undefined : value.trim()));

const bannerSchema = z.object({
  title: z.string().min(1, 'Banner title is required'),
  subtitle: stringOrEmpty.optional(),
  imageUrl: z.string().min(1, 'Image URL is required'),
  link: stringOrEmpty.optional(),
  ctaLabel: stringOrEmpty.optional(),
});

const dealSchema = z.object({
  name: z.string().min(1, 'Deal name is required'),
  discount: z.number().min(0).max(100),
  expiresAt: z
    .string()
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), 'Invalid expiration date'),
  productIds: z.array(z.string().min(1)).default([]),
});

const announcementSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  level: z.enum(['info', 'warning', 'success']).default('info'),
  startAt: z
    .string()
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), 'Invalid start date')
    .optional(),
  endAt: z
    .string()
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), 'Invalid end date')
    .optional(),
});

const marketingSchema = z.object({
  banners: z.array(bannerSchema).default([]),
  flashDeals: z.array(dealSchema).default([]),
  announcements: z.array(announcementSchema).default([]),
  newsletterSubject: stringOrEmpty.optional(),
  newsletterBody: stringOrEmpty.optional(),
});

type MarketingPayload = z.infer<typeof marketingSchema>;

export class MarketingController {
  static async getAdminConfig(req: Request, res: Response): Promise<void> {
    const db = mongo.getDb();
    const settings = await db.collection('settings').findOne({ key: 'marketing.settings' });
    res.json({ ok: true, data: settings?.value || defaultMarketingConfig() });
  }

  static async createAdminConfig(req: Request, res: Response): Promise<void> {
    try {
      const sanitized = sanitizeMarketingPayload(req.body);
      const validated = marketingSchema.parse(sanitized);
      const db = mongo.getDb();

      const result = await db.collection('settings').findOneAndUpdate(
        { key: 'marketing.settings' },
        {
          $setOnInsert: {
            createdAt: new Date(),
            createdBy: req.userId,
          },
          $set: {
            key: 'marketing.settings',
            value: validated,
            type: 'json',
            updatedAt: new Date(),
            updatedBy: req.userId,
          },
        },
        { upsert: true, returnDocument: 'after' }
      );

      res.status(201).json({ ok: true, data: result.value?.value || validated });
    } catch (error) {
      handleMarketingError(error, res);
    }
  }

  static async updateAdminConfig(req: Request, res: Response): Promise<void> {
    try {
      const sanitized = sanitizeMarketingPayload(req.body);
      const validated = marketingSchema.parse(sanitized);
      const db = mongo.getDb();
      await db.collection('settings').updateOne(
        { key: 'marketing.settings' },
        {
          $set: {
            key: 'marketing.settings',
            value: validated,
            type: 'json',
            updatedAt: new Date(),
            updatedBy: req.userId,
          },
        },
        { upsert: true }
      );
      res.json({ ok: true, data: validated });
    } catch (error) {
      handleMarketingError(error, res);
    }
  }

  static async deleteAdminConfig(req: Request, res: Response): Promise<void> {
    try {
      const db = mongo.getDb();
      await db.collection('settings').deleteOne({ key: 'marketing.settings' });
      res.json({ ok: true, data: defaultMarketingConfig() });
    } catch (error) {
      console.error('Delete marketing settings error', error);
      res.status(500).json({ ok: false, error: 'Failed to delete marketing settings' });
    }
  }

  static async publicFeed(req: Request, res: Response): Promise<void> {
    const db = mongo.getDb();
    const settings = await db.collection('settings').findOne({ key: 'marketing.settings' });
    res.json({ ok: true, data: settings?.value || defaultMarketingConfig() });
  }
}

function sanitizeMarketingPayload(payload: any): MarketingPayload {
  const safePayload = payload || {};

  const sanitizeString = (value: any) => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  };

  return {
    banners: Array.isArray(safePayload.banners)
      ? safePayload.banners.map((banner: any) => ({
          title: sanitizeString(banner?.title) || 'Untitled Banner',
          subtitle: sanitizeString(banner?.subtitle),
          imageUrl: sanitizeString(banner?.imageUrl) || 'https://placehold.co/1200x400',
          link: sanitizeString(banner?.link),
          ctaLabel: sanitizeString(banner?.ctaLabel),
        }))
      : [],
    flashDeals: Array.isArray(safePayload.flashDeals)
      ? safePayload.flashDeals.map((deal: any) => ({
          name: sanitizeString(deal?.name) || 'Deal',
          discount: Number.isFinite(deal?.discount) ? Number(deal.discount) : 0,
          expiresAt: typeof deal?.expiresAt === 'string' ? deal.expiresAt : new Date().toISOString(),
          productIds: Array.isArray(deal?.productIds)
            ? deal.productIds.filter((id: any) => typeof id === 'string' && id.trim().length > 0)
            : [],
        }))
      : [],
    announcements: Array.isArray(safePayload.announcements)
      ? safePayload.announcements.map((announcement: any) => ({
          message: sanitizeString(announcement?.message) || 'Announcement',
          level: announcement?.level === 'warning' || announcement?.level === 'success' ? announcement.level : 'info',
          startAt: sanitizeString(announcement?.startAt),
          endAt: sanitizeString(announcement?.endAt),
        }))
      : [],
    newsletterSubject: sanitizeString(safePayload.newsletterSubject),
    newsletterBody: sanitizeString(safePayload.newsletterBody),
  };
}

function handleMarketingError(error: unknown, res: Response) {
  if (error instanceof z.ZodError) {
    res.status(400).json({ ok: false, error: 'Validation failed', details: error.errors });
    return;
  }
  console.error('Marketing settings error', error);
  res.status(500).json({ ok: false, error: 'Failed to process marketing settings' });
}

function defaultMarketingConfig() {
  return {
    banners: [],
    flashDeals: [],
    announcements: [],
    newsletterSubject: '',
    newsletterBody: '',
  };
}

