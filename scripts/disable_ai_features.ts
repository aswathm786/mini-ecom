/**
 * Disable AI Recommendations and Product Enhancements
 * 
 * This script disables:
 * - AI recommendations (features.recommendations.ai.enabled)
 * - Product enhancements (features.ai.admin.productDescription.enabled)
 * 
 * While keeping AI studio (chat) enabled.
 */

import { mongo } from '../backend/src/db/Mongo';
import { settingsService } from '../backend/src/services/SettingsService';

async function disableAIFeatures() {
  try {
    console.log('Connecting to MongoDB...');
    await mongo.connect();
    console.log('Connected to MongoDB');

    // Get current feature flags
    const currentFlags = await settingsService.getFeatureFlags(true);
    console.log('Current feature flags retrieved');

    // Update recommendations to disable AI
    const updatedFlags = {
      ...currentFlags,
      recommendations: {
        ...currentFlags.recommendations,
        ai: {
          enabled: false,
        },
      },
      ai: {
        ...currentFlags.ai,
        // Ensure chat is enabled (AI Studio)
        chat: { enabled: true },
        admin: {
          ...currentFlags.ai?.admin,
          productDescription: {
            enabled: false,
          },
        },
      },
    };

    // Update feature flags in database
    console.log('Updating feature flags...');
    await settingsService.updateFeatureFlags(updatedFlags);
    console.log('✓ Feature flags updated');

    // Reload settings
    await settingsService.loadSettings();
    console.log('✓ Settings reloaded');

    // Verify the changes
    const verifyFlags = await settingsService.getFeatureFlags(true);
    const recommendationsEnabled = await settingsService.isFeatureEnabled('recommendations.ai.enabled');
    const productDescEnabled = await settingsService.isFeatureEnabled('ai.admin.productDescription.enabled');
    const chatEnabled = await settingsService.isFeatureEnabled('ai.chat.enabled');

    console.log('\n✅ Feature flags updated successfully!');
    console.log('\nVerification:');
    console.log(`  - AI Recommendations: ${recommendationsEnabled ? 'ENABLED' : 'DISABLED'} (should be DISABLED)`);
    console.log(`  - Product Enhancements: ${productDescEnabled ? 'ENABLED' : 'DISABLED'} (should be DISABLED)`);
    console.log(`  - AI Studio (Chat): ${chatEnabled ? 'ENABLED' : 'DISABLED'} (should be ENABLED)`);
  } catch (error) {
    console.error('Error disabling AI features:', error);
    process.exit(1);
  } finally {
    await mongo.close();
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  disableAIFeatures();
}

