/**
 * Admin IP Whitelist Middleware
 * 
 * Restricts admin access to whitelisted IP addresses when enabled.
 * Must be used after requireAuth and requireAdmin.
 */

import { Request, Response, NextFunction } from 'express';
import { adminSecurityService } from '../services/AdminSecurityService';
import { AuditLog } from '../types';
import { mongo } from '../db/Mongo';

/**
 * Get client IP address from request
 */
function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.ip ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

/**
 * Check if IP matches whitelist (supports CIDR notation)
 */
function isIpAllowed(clientIp: string, whitelist: string[]): boolean {
  if (whitelist.length === 0) {
    return false; // Empty whitelist = deny all
  }

  for (const allowedIp of whitelist) {
    // Exact match
    if (clientIp === allowedIp) {
      return true;
    }

    // CIDR notation support (e.g., 192.168.1.0/24)
    if (allowedIp.includes('/')) {
      if (isIpInCidr(clientIp, allowedIp)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if IP is within CIDR range
 */
function isIpInCidr(ip: string, cidr: string): boolean {
  const [network, prefixLength] = cidr.split('/');
  const prefix = parseInt(prefixLength, 10);

  if (isNaN(prefix) || prefix < 0 || prefix > 32) {
    return false;
  }

  const ipToNumber = (ip: string): number => {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  };

  const networkNum = ipToNumber(network);
  const ipNum = ipToNumber(ip);
  const mask = ~((1 << (32 - prefix)) - 1);

  return (networkNum & mask) === (ipNum & mask);
}

/**
 * Admin IP whitelist middleware
 */
export async function requireAdminIpWhitelist(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const config = await adminSecurityService.getAdminIpWhitelist();

    // If whitelist is disabled, allow all
    if (!config.enabled) {
      return next();
    }

    const clientIp = getClientIp(req);

    // Check if IP is whitelisted
    if (!isIpAllowed(clientIp, config.ips)) {
      // Log blocked attempt
      const db = mongo.getDb();
      const auditCollection = db.collection<AuditLog>('audit_logs');

      await auditCollection.insertOne({
        actorId: req.userId,
        actorType: 'user',
        action: 'admin.access.blocked.ip_whitelist',
        objectType: 'route',
        objectId: req.originalUrl,
        metadata: {
          clientIp,
          whitelistedIps: config.ips,
          method: req.method,
        },
        ipAddress: clientIp,
        userAgent: req.get('user-agent'),
        createdAt: new Date(),
      });

      res.status(403).json({
        ok: false,
        error: 'Access denied: Your IP address is not whitelisted for admin access',
        code: 'IP_WHITELIST_DENIED',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Admin IP whitelist middleware error:', error);
    // On error, deny access for security
    res.status(500).json({
      ok: false,
      error: 'Security check failed',
    });
  }
}
