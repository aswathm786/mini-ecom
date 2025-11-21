import { Request, Response } from 'express';
import { z } from 'zod';
import { mongo } from '../db/Mongo';
import { ObjectId } from 'mongodb';

const permissionCatalog = [
  { key: 'catalog.view', label: 'View Catalog', category: 'Catalog' },
  { key: 'catalog.manage', label: 'Manage Products', category: 'Catalog' },
  { key: 'orders.view', label: 'View Orders', category: 'Orders' },
  { key: 'orders.manage', label: 'Manage Orders', category: 'Orders' },
  { key: 'refunds.manage', label: 'Process Refunds', category: 'Orders' },
  { key: 'users.view', label: 'View Users', category: 'Customers' },
  { key: 'users.manage', label: 'Manage Users', category: 'Customers' },
  { key: 'marketing.manage', label: 'Marketing Studio', category: 'Marketing' },
  { key: 'webhooks.manage', label: 'Webhook Monitoring', category: 'Integrations' },
  { key: 'settings.manage', label: 'Platform Settings', category: 'Settings' },
];

const roleSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  permissions: z.array(z.string()).default([]),
});

const permissionsSchema = z.array(z.string());

export class AdminRolesController {
  static async listRoles(req: Request, res: Response): Promise<void> {
    const db = mongo.getDb();
    const rolesCollection = db.collection('roles');

    let roles = await rolesCollection.find().sort({ createdAt: 1 }).toArray();

    if (roles.length === 0) {
      const defaultRoles = [
          {
            name: 'Customer',
            description: 'Default storefront customer role',
            permissions: [],
            isSystem: true,
          },
        {
          name: 'Administrator',
          description: 'Full access to all modules',
          permissions: permissionCatalog.map((p) => p.key),
          isSystem: true,
        },
        {
          name: 'Support',
          description: 'Handle orders, refunds, and customers',
          permissions: ['orders.view', 'orders.manage', 'refunds.manage', 'users.view'],
          isSystem: true,
        },
        {
          name: 'Marketing',
          description: 'Manage campaigns and catalog updates',
          permissions: ['catalog.view', 'catalog.manage', 'marketing.manage'],
          isSystem: true,
        },
      ];

      await rolesCollection.insertMany(
        defaultRoles.map((role) => ({
          ...role,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
      );

      roles = await rolesCollection.find().toArray();
    }

    res.json({
      ok: true,
      data: roles.map((role) => ({
        _id: role._id?.toString(),
        name: role.name,
        description: role.description,
        permissions: role.permissions || [],
        isSystem: role.isSystem || false,
      })),
    });
  }

  static async listPermissions(req: Request, res: Response): Promise<void> {
    res.json({
      ok: true,
      data: permissionCatalog,
    });
  }

  static async createRole(req: Request, res: Response): Promise<void> {
    try {
      const validated = roleSchema.parse(req.body);
      const db = mongo.getDb();
      const rolesCollection = db.collection('roles');

      const existing = await rolesCollection.findOne({ name: validated.name });
      if (existing) {
        res.status(409).json({ ok: false, error: 'Role with this name already exists' });
        return;
      }

      const result = await rolesCollection.insertOne({
        ...validated,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      res.status(201).json({
        ok: true,
        data: { _id: result.insertedId.toString(), ...validated, isSystem: false },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ ok: false, error: 'Validation failed', details: error.errors });
        return;
      }
      console.error('Failed to create role', error);
      res.status(500).json({ ok: false, error: 'Failed to create role' });
    }
  }

  static async updateRole(req: Request, res: Response): Promise<void> {
    // Check if response already sent
    if (res.headersSent) {
      console.log('Response already sent, skipping');
      return;
    }

    try {
      console.log('updateRole called with ID:', req.params.id);
      console.log('Request body:', JSON.stringify(req.body));
      console.log('Request method:', req.method);
      console.log('Request path:', req.path);
      console.log('Request originalUrl:', req.originalUrl);
      
      const db = mongo.getDb();
      const rolesCollection = db.collection('roles');
      
      // Validate ObjectId format
      if (!req.params.id || !ObjectId.isValid(req.params.id)) {
        console.log('Invalid ObjectId format:', req.params.id);
        if (!res.headersSent) {
          res.status(400).json({ ok: false, error: 'Invalid role ID format' });
        }
        return;
      }
      
      const _id = new ObjectId(req.params.id);
      
      // Check if role exists first
      const existingRole = await rolesCollection.findOne({ _id });
      console.log('Existing role found:', existingRole ? 'yes' : 'no');
      if (!existingRole) {
        console.log('Role not found in database');
        if (!res.headersSent) {
          res.status(404).json({ ok: false, error: 'Role not found' });
        }
        return;
      }

      const update: Record<string, any> = {
        updatedAt: new Date(),
      };

      if (req.body.name) {
        update.name = req.body.name;
      }
      if (req.body.description !== undefined) {
        update.description = req.body.description;
      }
      if (Array.isArray(req.body.permissions)) {
        update.permissions = permissionsSchema.parse(req.body.permissions);
      } else if (Array.isArray(req.body.permissionKeys)) {
        update.permissions = permissionsSchema.parse(req.body.permissionKeys);
      }

      console.log('Update object:', JSON.stringify(update));
      
      // Use updateOne first, then fetch the updated document
      const updateResult = await rolesCollection.updateOne({ _id }, { $set: update });
      console.log('Update operation result:', {
        matchedCount: updateResult.matchedCount,
        modifiedCount: updateResult.modifiedCount,
        acknowledged: updateResult.acknowledged
      });

      if (updateResult.matchedCount === 0) {
        console.log('Role not found - no documents matched');
        if (!res.headersSent) {
          res.status(404).json({ ok: false, error: 'Role not found' });
        }
        return;
      }

      // Fetch the updated role
      const updatedRole = await rolesCollection.findOne({ _id });
      console.log('Updated role fetched:', updatedRole ? 'yes' : 'no');

      if (!updatedRole) {
        console.log('Role not found after update - fetch failed');
        if (!res.headersSent) {
          res.status(404).json({ ok: false, error: 'Role not found after update' });
        }
        return;
      }

      const responseData = {
        ok: true,
        data: {
          _id: updatedRole._id?.toString(),
          name: updatedRole.name,
          description: updatedRole.description,
          permissions: updatedRole.permissions || [],
          isSystem: updatedRole.isSystem || false,
        },
      };
      
      console.log('Sending response:', JSON.stringify(responseData));
      if (!res.headersSent) {
        res.status(200).json(responseData);
        console.log('Response sent successfully');
      } else {
        console.log('Response already sent, cannot send again');
      }
    } catch (error) {
      console.error('Error in updateRole:', error);
      if (res.headersSent) {
        console.log('Response already sent, cannot send error response');
        return;
      }
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ ok: false, error: 'Validation failed', details: error.errors });
        return;
      }
      // Handle ObjectId construction errors
      if (error instanceof Error && error.message.includes('ObjectId')) {
        res.status(400).json({ ok: false, error: 'Invalid role ID format' });
        return;
      }
      console.error('Failed to update role', error);
      res.status(500).json({ ok: false, error: 'Failed to update role' });
    }
  }

  static async deleteRole(req: Request, res: Response): Promise<void> {
    try {
      const db = mongo.getDb();
      const rolesCollection = db.collection('roles');
      const _id = new ObjectId(req.params.id);

      const role = await rolesCollection.findOne({ _id });
      if (!role) {
        res.status(404).json({ ok: false, error: 'Role not found' });
        return;
      }
      if (role.isSystem) {
        res.status(400).json({ ok: false, error: 'System roles cannot be deleted' });
        return;
      }
      // Prevent deletion of admin and root roles
      const roleNameLower = role.name?.toLowerCase();
      if (roleNameLower === 'admin' || roleNameLower === 'root') {
        res.status(400).json({ ok: false, error: 'Admin and root roles cannot be deleted' });
        return;
      }

      await rolesCollection.deleteOne({ _id });
      res.json({ ok: true, message: 'Role deleted' });
    } catch (error) {
      console.error('Failed to delete role', error);
      res.status(500).json({ ok: false, error: 'Failed to delete role' });
    }
  }
}


