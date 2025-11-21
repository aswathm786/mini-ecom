/**
 * Express Server
 * 
 * Main entry point for the Handmade Harmony backend API.
 * 
 * Initializes:
 * - MongoDB connection
 * - Settings service (loads DB settings)
 * - Express app with security middlewares
 * - Routes
 * - Error handling
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { mongo } from './db/Mongo';
import { settingsService } from './services/SettingsService';
import { Config } from './config/Config';
import { setupHelmet, setupCors } from './middleware/Security';
import routes from './routes';
import { maintenanceModeGuard } from './middleware/MaintenanceMode';

const app: Express = express();

// Trust proxy (for rate limiting and IP detection behind reverse proxy)
app.set('trust proxy', 1);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser - must be before CORS to ensure cookies are parsed correctly
app.use(cookieParser());

// Security middlewares
// Note: Cookie parser is placed before CORS to ensure cookies are available
// for CORS credential handling
setupHelmet(app);
setupCors(app);

// Note: Rate limiting is applied selectively to specific route groups
// Public/common endpoints use lenient rate limiting
// Authentication endpoints use strict rate limiting

// Maintenance mode
app.use(maintenanceModeGuard);

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: Config.APP_NAME,
    version: '1.0.0',
    status: 'running',
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  
  res.status(500).json({
    error: 'Internal server error',
    message: Config.NODE_ENV === 'development' ? err.message : undefined,
  });
});

/**
 * Start server
 */
async function startServer(): Promise<void> {
  try {
    // Connect to MongoDB
    await mongo.connect();
    
    // Load runtime settings from database
    await settingsService.loadSettings();
    
    // Initialize default country (India)
    const { CountryController } = await import('./controllers/CountryController');
    await CountryController.initializeDefaultCountry();
    
    // Start Express server
    const port = Config.PORT;
    app.listen(port, () => {
      console.log(`\n✓ Server running on port ${port}`);
      console.log(`✓ Environment: ${Config.NODE_ENV}`);
      console.log(`✓ API URL: ${Config.API_URL}\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await mongo.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await mongo.close();
  process.exit(0);
});

// Start server
startServer();

