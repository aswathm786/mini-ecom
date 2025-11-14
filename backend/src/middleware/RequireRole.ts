/**
 * Require Role Middleware
 * 
 * RBAC middleware to check user roles.
 * Must be used after requireAuth middleware.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Require specific role(s)
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        ok: false,
        error: 'Authentication required',
      });
      return;
    }
    
    const userRole = (req.user as any).role;
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      res.status(403).json({
        ok: false,
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
      });
      return;
    }
    
    next();
  };
}

/**
 * Require admin role (shorthand)
 */
export const requireAdmin = requireRole('admin');

