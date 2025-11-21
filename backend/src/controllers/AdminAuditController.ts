import { Request, Response } from 'express';
import { mongo } from '../db/Mongo';
import { AuditLog, User } from '../types';
import { parsePagination } from '../helpers/pagination';
import { Filter, ObjectId } from 'mongodb';

export class AdminAuditController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const pagination = parsePagination(req.query);
      const db = mongo.getDb();
      const auditCollection = db.collection<AuditLog>('audit_logs');
      const usersCollection = db.collection<User>('users');

      const query: Filter<AuditLog> = {};
      const search = (req.query.search as string) || undefined;
      const actor = (req.query.actor as string) || undefined;
      const action = (req.query.action as string) || undefined;

      if (actor) {
        query.actorId = actor;
      }
      if (action) {
        query.action = { $regex: action, $options: 'i' };
      }
      if (search) {
        query.$or = [
          { action: { $regex: search, $options: 'i' } },
          { objectType: { $regex: search, $options: 'i' } },
          { objectId: { $regex: search, $options: 'i' } },
          { 'metadata.name': { $regex: search, $options: 'i' } },
        ];
      }

      const [logs, total] = await Promise.all([
        auditCollection
          .find(query)
          .sort({ createdAt: -1 })
          .skip(pagination.skip)
          .limit(pagination.limit)
          .toArray(),
        auditCollection.countDocuments(query),
      ]);

      const actorIds = Array.from(new Set(logs.map((log) => log.actorId).filter(Boolean))) as string[];
      let userMap = new Map<string, User>();

      const validActorIds = actorIds.filter((id) => ObjectId.isValid(id));

      if (validActorIds.length > 0) {
        const objectIds = validActorIds.map((id) => new ObjectId(id));
        const users = await usersCollection
          .find({
            _id: { $in: objectIds },
          } as any)
          .project({ email: 1, firstName: 1, lastName: 1 })
          .toArray();
        userMap = new Map(users.map((user: any) => [user._id?.toString() || '', user as User]));
      }

      const items = logs.map((log) => {
        const actorUser = log.actorId ? userMap.get(log.actorId) : undefined;

        const actorDisplay =
          actorUser?.email ??
          (
            [actorUser?.firstName, actorUser?.lastName].filter(Boolean).join(' ') ||
            log.actorId ||
            log.actorType
          );
        

        return {
          _id: log._id?.toString() || '',
          actor: actorDisplay,
          action: log.action,
          object: [log.objectType, log.objectId].filter(Boolean).join(' '),
          meta: log.metadata ?? null,
          createdAt: log.createdAt,
        };
      });

      res.json({
        ok: true,
        data: {
          items,
          total,
          pages: Math.ceil(total / pagination.limit),
        },
      });
    } catch (error) {
      console.error('Failed to load audit logs', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to load audit logs',
      });
    }
  }

  /**
   * POST /api/admin/audit/log-access-attempt
   * Log unauthorized access attempt from frontend
   */
  static async logAccessAttempt(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }

      const { path, requiredPermissions, requiredRoles, userRoles, userPermissions, timestamp } = req.body;

      const db = mongo.getDb();
      const auditCollection = db.collection<AuditLog>('audit_logs');

      await auditCollection.insertOne({
        actorId: req.userId,
        actorType: 'user',
        action: 'auth.access.denied.frontend',
        objectType: 'route',
        objectId: path || req.originalUrl,
        metadata: {
          requiredPermissions: requiredPermissions || [],
          requiredRoles: requiredRoles || [],
          userRoles: userRoles || [],
          userPermissions: userPermissions || [],
          method: req.method,
          source: 'frontend',
          timestamp: timestamp || new Date().toISOString(),
        },
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
        createdAt: new Date(),
      });

      res.json({
        ok: true,
        message: 'Access attempt logged',
      });
    } catch (error) {
      console.error('Failed to log access attempt:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to log access attempt',
      });
    }
  }
}


