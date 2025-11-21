/**
 * Bulk Import Controller
 */

import { Request, Response } from 'express';
import { bulkImportService } from '../services/BulkImportService';

export class BulkImportController {
  static async importProducts(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ ok: false, error: 'Authentication required' });
        return;
      }

      // Check if bulk import is enabled
      const { settingsService } = await import('../services/SettingsService');
      const bulkImportEnabled = await settingsService.isFeatureEnabled('tools.bulkImport.enabled');
      if (!bulkImportEnabled) {
        res.status(403).json({
          ok: false,
          error: 'Bulk import is currently disabled',
        });
        return;
      }

      const csvContent = req.body.csv || req.body.content;
      if (!csvContent || typeof csvContent !== 'string') {
        res.status(400).json({ ok: false, error: 'CSV content required' });
        return;
      }

      const result = await bulkImportService.importProducts(csvContent, req.userId);

      res.json({ ok: result.success, data: result });
    } catch (error) {
      console.error('Error importing products:', error);
      res.status(500).json({ ok: false, error: 'Failed to import products' });
    }
  }

  static async getTemplate(req: Request, res: Response): Promise<void> {
    try {
      const template = bulkImportService.generateTemplate();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="product_import_template.csv"');
      res.send(template);
    } catch (error) {
      console.error('Error generating template:', error);
      res.status(500).json({ ok: false, error: 'Failed to generate template' });
    }
  }
}

