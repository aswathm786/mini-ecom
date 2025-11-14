/**
 * Health Check Controller
 * 
 * Provides health check endpoint for monitoring and load balancers.
 */

import { Request, Response } from 'express';
import { mongo } from '../db/Mongo';

export class HealthController {
  /**
   * GET /api/health
   * Returns server health status including MongoDB connectivity
   */
  static async health(req: Request, res: Response): Promise<void> {
    let mongoConnected = false;
    
    try {
      if (mongo.isConnected()) {
        const db = mongo.getDb();
        await db.admin().ping();
        mongoConnected = true;
      }
    } catch (error) {
      // MongoDB not connected
      mongoConnected = false;
    }
    
    res.json({
      status: 'ok',
      mongoConnected,
      timestamp: new Date().toISOString(),
    });
  }
}

