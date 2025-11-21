/**
 * Maintenance Mode Middleware
 * 
 * Checks if site is in maintenance mode and blocks requests
 * except for admin users and whitelisted IPs
 */

import { Request, Response, NextFunction } from 'express';
import { settingsService } from '../services/SettingsService';

export async function maintenanceModeGuard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Try to get maintenance settings, but fail gracefully if MongoDB isn't connected
    let site;
    try {
      site = await settingsService.getSetting('site');
    } catch (error) {
      // If settings service fails (e.g., MongoDB not connected), allow request through
      console.warn('Could not check maintenance mode (settings service unavailable):', error);
      next();
      return;
    }

    const maintenance = site?.maintenance;

    if (!maintenance?.enabled) {
      next();
      return;
    }

    // Check if user is admin
    const isAdmin = (req.user as any)?.role === 'admin' || (req.user as any)?.role === 'root';
    if (isAdmin) {
      next();
      return;
    }

    // Check IP whitelist
    const whitelistIps = maintenance.whitelistIps || [];
    const clientIp = req.ip || req.socket.remoteAddress || '';
    
    if (whitelistIps.length > 0 && whitelistIps.includes(clientIp)) {
      next();
      return;
    }

    // Return maintenance page
    res.status(503).json({
      ok: false,
      error: 'Service temporarily unavailable',
      message: maintenance.message || 'We are currently performing maintenance. Please check back soon.',
      maintenance: true,
    });
  } catch (error) {
    console.error('Error checking maintenance mode:', error);
    // On error, allow request through (fail open)
    next();
  }
}
