#!/usr/bin/env ts-node
/**
 * Price Alert Checker
 * 
 * This script checks for price drops and sends notifications.
 * Should be run periodically via cron job.
 * 
 * Usage: ts-node scripts/check_price_alerts.ts
 */

import { mongo } from '../backend/src/db/Mongo';
import { priceAlertService } from '../backend/src/services/PriceAlertService';

async function main() {
  try {
    console.log('Starting price alert check...');
    
    // Connect to database
    await mongo.connect();
    console.log('Connected to database');

    // Check and notify
    const notifiedCount = await priceAlertService.checkAndNotifyPriceDrops();
    
    console.log(`Price alert check completed. Notified ${notifiedCount} users.`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking price alerts:', error);
    process.exit(1);
  } finally {
    await mongo.disconnect();
  }
}

main();

