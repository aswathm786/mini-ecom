/**
 * Tracking Sync CLI
 * 
 * Polls Delhivery API for shipment tracking updates and syncs to database.
 * 
 * Usage:
 *   ts-node cli/tracking_sync.ts
 *   or
 *   node dist/cli/tracking_sync.js
 */

import { mongo } from '../db/Mongo';
import { delhiveryService } from '../services/DelhiveryService';
import { ObjectId } from 'mongodb';

interface Shipment {
  _id?: string;
  orderId: string;
  awb?: string;
  status: string;
  updatedAt: Date;
}

class TrackingSync {
  /**
   * Sync tracking for all pending shipments
   */
  async syncAll(): Promise<void> {
    const db = mongo.getDb();
    const shipmentsCollection = db.collection<Shipment>('shipments');
    
    // Get all shipments with AWB that are not delivered
    const shipments = await shipmentsCollection
      .find({
        awb: { $exists: true, $ne: null },
        status: { $nin: ['delivered', 'failed'] },
      })
      .toArray();
    
    console.log(`Found ${shipments.length} shipments to sync`);
    
    for (const shipment of shipments) {
      if (!shipment.awb) {
        continue;
      }
      
      try {
        console.log(`Syncing tracking for AWB: ${shipment.awb}`);
        await delhiveryService.track(shipment.awb);
        console.log(`✓ Synced AWB: ${shipment.awb}`);
      } catch (error) {
        console.error(`✗ Error syncing AWB ${shipment.awb}:`, error);
      }
    }
  }

  /**
   * Sync tracking for specific AWB
   */
  async syncAWB(awb: string): Promise<void> {
    try {
      console.log(`Syncing tracking for AWB: ${awb}`);
      const shipment = await delhiveryService.track(awb);
      if (shipment) {
        console.log(`✓ Synced AWB: ${awb}, Status: ${shipment.status}`);
      } else {
        console.log(`✗ Shipment not found for AWB: ${awb}`);
      }
    } catch (error) {
      console.error(`✗ Error syncing AWB ${awb}:`, error);
      throw error;
    }
  }
}

// CLI entry point
async function main() {
  try {
    // Connect to MongoDB
    await mongo.connect();
    console.log('Connected to MongoDB');
    
    const sync = new TrackingSync();
    
    // Check if AWB provided as argument
    const awb = process.argv[2];
    
    if (awb) {
      // Sync specific AWB
      await sync.syncAWB(awb);
    } else {
      // Sync all pending shipments
      await sync.syncAll();
    }
    
    // Close connection
    await mongo.close();
    console.log('Tracking sync completed');
    process.exit(0);
  } catch (error) {
    console.error('Error in tracking sync:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { TrackingSync };

