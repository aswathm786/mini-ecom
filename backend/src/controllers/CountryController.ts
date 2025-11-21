/**
 * Country Controller
 * 
 * Handles country management operations.
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { mongo } from '../db/Mongo';
import { ObjectId } from 'mongodb';

interface Country {
  _id?: string;
  name: string;
  code: string; // ISO country code
  isDefault: boolean;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const createCountrySchema = z.object({
  name: z.string().min(1, 'Country name is required'),
  code: z.string().length(2, 'Country code must be 2 characters (ISO code)'),
  isDefault: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

const updateCountrySchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().length(2).optional(),
  isDefault: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

export class CountryController {
  /**
   * GET /api/admin/countries
   * List all countries
   */
  static async listCountries(req: Request, res: Response): Promise<void> {
    try {
      const db = mongo.getDb();
      const countriesCollection = db.collection<Country>('countries');

      const countries = await countriesCollection.find({}).sort({ name: 1 }).toArray();

      res.json({
        ok: true,
        data: countries.map(c => ({
          _id: c._id?.toString(),
          name: c.name,
          code: c.code,
          isDefault: c.isDefault || false,
          enabled: c.enabled !== false, // Default to true
        })),
      });
    } catch (error) {
      console.error('Error listing countries:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch countries',
      });
    }
  }

  /**
   * GET /api/countries
   * Get enabled countries (public)
   */
  static async getEnabledCountries(req: Request, res: Response): Promise<void> {
    try {
      const db = mongo.getDb();
      const countriesCollection = db.collection<Country>('countries');

      const countries = await countriesCollection
        .find({ enabled: true })
        .sort({ isDefault: -1, name: 1 })
        .toArray();

      res.json({
        ok: true,
        data: countries.map(c => ({
          _id: c._id?.toString(),
          name: c.name,
          code: c.code,
          isDefault: c.isDefault || false,
        })),
      });
    } catch (error) {
      console.error('Error fetching enabled countries:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch countries',
      });
    }
  }

  /**
   * POST /api/admin/countries
   * Create a new country
   */
  static async createCountry(req: Request, res: Response): Promise<void> {
    try {
      const validated = createCountrySchema.parse(req.body);

      const db = mongo.getDb();
      const countriesCollection = db.collection<Country>('countries');

      // Check if country code already exists
      const existing = await countriesCollection.findOne({ code: validated.code.toUpperCase() });
      if (existing) {
        res.status(400).json({
          ok: false,
          error: 'Country with this code already exists',
        });
        return;
      }

      // If this is set as default, unset other defaults
      if (validated.isDefault) {
        await countriesCollection.updateMany(
          { isDefault: true },
          { $set: { isDefault: false } }
        );
      }

      const country: Country = {
        name: validated.name,
        code: validated.code.toUpperCase(),
        isDefault: validated.isDefault || false,
        enabled: validated.enabled !== false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await countriesCollection.insertOne(country);

      res.status(201).json({
        ok: true,
        data: {
          _id: result.insertedId.toString(),
          ...country,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          ok: false,
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }

      console.error('Error creating country:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to create country',
      });
    }
  }

  /**
   * PUT /api/admin/countries/:id
   * Update a country
   */
  static async updateCountry(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const validated = updateCountrySchema.parse(req.body);

      const db = mongo.getDb();
      const countriesCollection = db.collection<Country>('countries');

      const country = await countriesCollection.findOne({ _id: new ObjectId(id) });
      if (!country) {
        res.status(404).json({
          ok: false,
          error: 'Country not found',
        });
        return;
      }

      // If setting as default, unset other defaults
      if (validated.isDefault === true) {
        await countriesCollection.updateMany(
          { _id: { $ne: new ObjectId(id) }, isDefault: true },
          { $set: { isDefault: false } }
        );
      }

      const updateData: Partial<Country> = {
        updatedAt: new Date(),
      };

      if (validated.name) updateData.name = validated.name;
      if (validated.code) updateData.code = validated.code.toUpperCase();
      if (validated.isDefault !== undefined) updateData.isDefault = validated.isDefault;
      if (validated.enabled !== undefined) updateData.enabled = validated.enabled;

      await countriesCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      const updated = await countriesCollection.findOne({ _id: new ObjectId(id) });

      res.json({
        ok: true,
        data: {
          _id: updated?._id?.toString(),
          name: updated?.name,
          code: updated?.code,
          isDefault: updated?.isDefault || false,
          enabled: updated?.enabled !== false,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          ok: false,
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }

      console.error('Error updating country:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update country',
      });
    }
  }

  /**
   * DELETE /api/admin/countries/:id
   * Delete a country
   */
  static async deleteCountry(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const db = mongo.getDb();
      const countriesCollection = db.collection<Country>('countries');

      const country = await countriesCollection.findOne({ _id: new ObjectId(id) });
      if (!country) {
        res.status(404).json({
          ok: false,
          error: 'Country not found',
        });
        return;
      }

      // Don't allow deleting if it's the only country
      const count = await countriesCollection.countDocuments({ enabled: true });
      if (count <= 1 && country.enabled) {
        res.status(400).json({
          ok: false,
          error: 'Cannot delete the last enabled country',
        });
        return;
      }

      await countriesCollection.deleteOne({ _id: new ObjectId(id) });

      res.json({
        ok: true,
        message: 'Country deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting country:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to delete country',
      });
    }
  }

  /**
   * Initialize default country (India)
   */
  static async initializeDefaultCountry(): Promise<void> {
    try {
      const db = mongo.getDb();
      const countriesCollection = db.collection<Country>('countries');

      const existing = await countriesCollection.findOne({ code: 'IN' });
      if (!existing) {
        await countriesCollection.insertOne({
          name: 'India',
          code: 'IN',
          isDefault: true,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Error initializing default country:', error);
    }
  }
}

