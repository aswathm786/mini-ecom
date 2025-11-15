/**
 * Require Role Middleware
 * 
 * RBAC middleware to check user roles and permissions.
 * Must be used after requireAuth middleware.
 * 
 * Implements full RBAC by checking:
 * 1. Direct user role (user.role)
 * 2. User roles from user_roles collection
 * 3. Permissions from roles collection
 * 4. Direct user permissions (user.permissions)
 */

import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { mongo } from '../db/Mongo';

interface Role {
  _id?: string;
  name: string;
  permissions: string[];
}

interface UserRole {
  userId: string;
  roleId: string;
  roleName?: string;
}

/**
 * Get all roles for a user from database
 */
async function getUserRoles(userId: string): Promise<string[]> {
  const db = mongo.getDb();
  const userRolesCollection = db.collection<UserRole>('user_roles');
  const rolesCollection = db.collection<Role>('roles');
  
  // Get role assignments from user_roles collection
  const userRoleAssignments = await userRolesCollection.find({ userId }).toArray();
  
  // Extract role names
  const roleNames: string[] = [];
  
  for (const assignment of userRoleAssignments) {
    if (assignment.roleName) {
      roleNames.push(assignment.roleName);
    } else if (assignment.roleId) {
      // If roleName not stored, fetch from roles collection
      const role = await rolesCollection.findOne({ _id: new ObjectId(assignment.roleId) });
      if (role) {
        roleNames.push(role.name);
      }
    }
  }
  
  return roleNames;
}

/**
 * Get all permissions for a user
 */
async function getUserPermissions(userId: string, userRoles: string[]): Promise<string[]> {
  const db = mongo.getDb();
  const rolesCollection = db.collection<Role>('roles');
  const usersCollection = db.collection('users');
  
  const permissions = new Set<string>();
  
  // Get direct user permissions
  const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
  if (user && (user as any).permissions && Array.isArray((user as any).permissions)) {
    (user as any).permissions.forEach((p: string) => permissions.add(p));
  }
  
  // Get permissions from roles
  if (userRoles.length > 0) {
    const roles = await rolesCollection.find({ name: { $in: userRoles } }).toArray();
    for (const role of roles) {
      if (role.permissions) {
        role.permissions.forEach((p: string) => {
          if (p === '*') {
            // Root role - has all permissions
            permissions.add('*');
          } else {
            permissions.add(p);
          }
        });
      }
    }
  }
  
  return Array.from(permissions);
}

/**
 * Require specific role(s)
 */
export function requireRole(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || !req.userId) {
      res.status(401).json({
        ok: false,
        error: 'Authentication required',
      });
      return;
    }
    
    try {
      // Get user's roles from database
      const userRoles = await getUserRoles(req.userId);
      
      // Also check direct user.role field (for backward compatibility)
      const directRole = (req.user as any).role;
      if (directRole && !userRoles.includes(directRole)) {
        userRoles.push(directRole);
      }
      
      // Check if user has any of the allowed roles
      const hasRole = userRoles.some(role => allowedRoles.includes(role));
      
      if (!hasRole) {
        res.status(403).json({
          ok: false,
          error: 'Insufficient permissions',
          code: 'FORBIDDEN',
        });
        return;
      }
      
      next();
    } catch (error) {
      console.error('Error checking user roles:', error);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  };
}

/**
 * Require specific permission(s)
 */
export function requirePermission(...requiredPermissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || !req.userId) {
      res.status(401).json({
        ok: false,
        error: 'Authentication required',
      });
      return;
    }
    
    try {
      // Get user's roles
      const userRoles = await getUserRoles(req.userId);
      const directRole = (req.user as any).role;
      if (directRole && !userRoles.includes(directRole)) {
        userRoles.push(directRole);
      }
      
      // Get user's permissions
      const userPermissions = await getUserPermissions(req.userId, userRoles);
      
      // Check if user has all required permissions (or has '*' which grants all)
      const hasAllPermissions = requiredPermissions.every(required => 
        userPermissions.includes('*') || userPermissions.includes(required)
      );
      
      if (!hasAllPermissions) {
        res.status(403).json({
          ok: false,
          error: 'Insufficient permissions',
          code: 'FORBIDDEN',
        });
        return;
      }
      
      next();
    } catch (error) {
      console.error('Error checking user permissions:', error);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  };
}

/**
 * Require admin role (shorthand)
 * Checks for 'admin' or 'root' roles
 */
export const requireAdmin = requireRole('admin', 'root');

