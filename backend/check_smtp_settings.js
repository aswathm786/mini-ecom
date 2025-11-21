// Quick script to check SMTP settings in MongoDB
// Run with: node check_smtp_settings.js

const { MongoClient } = require('mongodb');
const path = require('path');

// Load environment variables from root .env
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const uri = process.env.MONGODB_URI || 'mongodb://admin:changeme@localhost:27017/handmade_harmony?authSource=admin';

async function checkSMTP() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('handmade_harmony');
    const settingsCollection = db.collection('settings');
    
    console.log('\n=== Checking SMTP Settings ===\n');
    
    const smtpSettings = await settingsCollection.find({
      key: { $in: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM_EMAIL'] }
    }).toArray();
    
    if (smtpSettings.length === 0) {
      console.log('❌ No SMTP settings found in database');
    } else {
      console.log(`✓ Found ${smtpSettings.length} SMTP setting(s):\n`);
      smtpSettings.forEach(setting => {
        const value = setting.key.includes('PASS') ? '***' : setting.value;
        console.log(`  ${setting.key}: ${value} (type: ${setting.type})`);
        console.log(`    Created: ${setting.createdAt}`);
        console.log(`    Updated: ${setting.updatedAt}`);
        if (setting.updatedBy) {
          console.log(`    Updated by: ${setting.updatedBy}`);
        }
        console.log('');
      });
    }
    
    // Check all settings
    const allSettings = await settingsCollection.find({}).toArray();
    console.log(`\nTotal settings in database: ${allSettings.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkSMTP();

