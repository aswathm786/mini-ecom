/**
 * Support Ticket Controller
 * 
 * Handles support ticket operations for both users and admins.
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { mongo } from '../db/Mongo';
import { ObjectId } from 'mongodb';
import { parsePagination, getPaginationMeta } from '../helpers/pagination';
import { sanitizePlainText, sanitizeHtmlContent } from '../helpers/sanitize';
import { emailTriggerService } from '../services/EmailTriggerService';
import { EmailEventType } from '../models/EmailTemplate';

// Validation schemas
const createTicketSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject is too long'),
  message: z.string().min(1, 'Message is required').max(5000, 'Message is too long'),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
});

const replyTicketSchema = z.object({
  message: z.string().min(1, 'Message is required').max(5000, 'Message is too long'),
});

const updateStatusSchema = z.object({
  status: z.enum(['open', 'pending', 'resolved', 'closed']),
});

export class SupportTicketController {
  /**
   * GET /api/support/tickets (User) or /api/admin/support/tickets (Admin)
   * List support tickets
   */
  static async listTickets(req: Request, res: Response): Promise<void> {
    try {
      const db = mongo.getDb();
      const ticketsCollection = db.collection('support_tickets');
      const usersCollection = db.collection('users');
      
      const pagination = parsePagination(req.query);
      const userRoles = (req.user as any)?.roles || [];
      const directRole = (req.user as any)?.role;
      const isAdmin =
        directRole === 'admin' ||
        directRole === 'root' ||
        userRoles?.includes?.('admin') ||
        userRoles?.includes?.('root');
      
      // Build query
      const query: any = {};
      
      // Users can only see their own tickets
      if (!isAdmin && req.userId) {
        query.userId = req.userId;
      }
      
      // Apply filters
      if (req.query.status) {
        query.status = req.query.status;
      }
      if (req.query.priority) {
        query.priority = req.query.priority;
      }
      if (req.query.search) {
        query.$or = [
          { subject: { $regex: req.query.search, $options: 'i' } },
        ];
      }
      if (req.query.userId && isAdmin) {
        query.userId = req.query.userId;
      }
      
      const tickets = await ticketsCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .toArray();
      
      const total = await ticketsCollection.countDocuments(query);
      
      const ticketIds = tickets.map(t => t._id?.toString()).filter(Boolean) as string[];

      if (isAdmin && ticketIds.length > 0) {
        const validUserIds = [...new Set(tickets.map(t => t.userId).filter(id => ObjectId.isValid(id)))] as string[];
        if (validUserIds.length > 0) {
          const users = await usersCollection
            .find({ _id: { $in: validUserIds.map(id => new ObjectId(id)) } })
            .project({ email: 1 })
            .toArray();
          const userMap = new Map(users.map(u => [u._id?.toString() || '', u.email]));
          tickets.forEach(ticket => {
            (ticket as any).userEmail = userMap.get(ticket.userId);
          });
        }
      }

      const repliesCollection = db.collection('support_ticket_replies');
      let replyCountsMap = new Map<string, number>();
      if (ticketIds.length > 0) {
        const replyCounts = await repliesCollection
          .aggregate([
            { $match: { ticketId: { $in: ticketIds } } },
            { $group: { _id: '$ticketId', count: { $sum: 1 } } },
          ])
          .toArray();
        replyCountsMap = new Map(replyCounts.map(rc => [rc._id, rc.count]));
      }

      const items = tickets.map(ticket => ({
        _id: ticket._id?.toString() || '',
        userId: ticket.userId,
        userEmail: (ticket as any).userEmail,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        lastReplyAt: ticket.lastReplyAt,
        replyCount: replyCountsMap.get(ticket._id?.toString() || '') || 0,
      }));

      res.json({
        ok: true,
        data: {
          items,
          total,
          pages: Math.ceil(total / pagination.limit),
        },
      });
    } catch (error) {
      console.error('Error listing tickets:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch tickets',
      });
    }
  }

  /**
   * GET /api/support/tickets/:id (User) or /api/admin/support/tickets/:id (Admin)
   * Get ticket details with replies
   */
  static async getTicket(req: Request, res: Response): Promise<void> {
    try {
      const db = mongo.getDb();
      const ticketsCollection = db.collection('support_tickets');
      const repliesCollection = db.collection('support_ticket_replies');
      const usersCollection = db.collection('users');
      
      const ticketId = req.params.id;
      
      // Validate ObjectId format
      if (!ObjectId.isValid(ticketId)) {
        res.status(400).json({ ok: false, error: 'Invalid ticket ID format' });
        return;
      }
      
      // Check if user is admin - check both direct role and roles array
      const userRoles = (req.user as any)?.roles || [];
      const directRole = (req.user as any)?.role;
      const allRoles = [...new Set([...userRoles, ...(directRole ? [directRole] : [])])];
      const isAdmin = allRoles.some(role => 
        ['admin', 'root', 'administrator'].includes(role?.toLowerCase())
      ) || (req.path?.startsWith('/admin')); // If accessing through admin route, consider as admin
      
      const ticket = await ticketsCollection.findOne({ _id: new ObjectId(ticketId) });
      
      if (!ticket) {
        res.status(404).json({ ok: false, error: 'Ticket not found' });
        return;
      }
      
      // Check permissions - admins can see all tickets, users can only see their own
      if (!isAdmin && ticket.userId !== req.userId) {
        res.status(403).json({ ok: false, error: 'Access denied' });
        return;
      }
      
      // Get replies - ticketId is stored as string in replies collection
      const replies = await repliesCollection
        .find({ ticketId: ticketId })
        .sort({ createdAt: 1 })
        .toArray();
      
      // Populate user emails
      const userIds = [...new Set([ticket.userId, ...replies.map(r => r.userId)])];
      const users = await usersCollection
        .find({ _id: { $in: userIds.map(id => new ObjectId(id)) } })
        .toArray();
      const userMap = new Map(users.map(u => [u._id.toString(), u.email]));
      
      (ticket as any).userEmail = userMap.get(ticket.userId);
      (ticket as any).replies = replies.map(reply => ({
        _id: reply._id?.toString() || reply._id,
        userId: reply.userId,
        userEmail: userMap.get(reply.userId),
        message: reply.message,
        attachments: reply.attachments || [],
        isAdmin: (reply as any).isAdmin || false,
        createdAt: reply.createdAt,
      }));
      
      // Also include messages for user-facing API (maps isAdmin to isAgent)
      (ticket as any).messages = replies.map(reply => ({
        _id: reply._id?.toString() || reply._id,
        userId: reply.userId,
        message: reply.message,
        attachments: reply.attachments || [],
        isAgent: (reply as any).isAdmin || false,
        createdAt: reply.createdAt,
      }));
      
      res.json({
        ok: true,
        data: ticket,
      });
    } catch (error) {
      console.error('Error getting ticket:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch ticket',
      });
    }
  }

  /**
   * POST /api/support/tickets
   * Create a new support ticket (user only)
   */
  static async createTicket(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ ok: false, error: 'Authentication required' });
        return;
      }
      
      // Validate input
      const validated = createTicketSchema.parse(req.body);
      
      const db = mongo.getDb();
      const ticketsCollection = db.collection('support_tickets');
      
      const { subject, message, priority } = validated;
      
      // Sanitize user input to prevent XSS
      const sanitizedSubject = sanitizePlainText(subject);
      const sanitizedMessage = sanitizeHtmlContent(message);
      
      const ticket = {
        userId: req.userId,
        subject: sanitizedSubject,
        status: 'open',
        priority,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const result = await ticketsCollection.insertOne(ticket);
      const ticketId = result.insertedId.toString();
      
      // Create initial reply
      const repliesCollection = db.collection('support_ticket_replies');
      await repliesCollection.insertOne({
        ticketId,
        userId: req.userId,
        message: sanitizedMessage,
        isAdmin: false,
        createdAt: new Date(),
      });
      
      res.status(201).json({
        ok: true,
        data: { _id: ticketId, ...ticket },
      });
    } catch (error) {
      console.error('Error creating ticket:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to create ticket',
      });
    }
  }

  /**
   * POST /api/support/tickets/:id/reply
   * Reply to a ticket
   */
  static async replyToTicket(req: Request, res: Response): Promise<void> {
    try {
      // Validate input
      const validated = replyTicketSchema.parse(req.body);
      
      const db = mongo.getDb();
      const ticketsCollection = db.collection('support_tickets');
      const repliesCollection = db.collection('support_ticket_replies');
      
      const ticketId = req.params.id;
      const { message } = validated;
      
      // Check if user is admin - check both direct role and roles array
      const userRoles = (req.user as any)?.roles || [];
      const directRole = (req.user as any)?.role;
      const allRoles = [...new Set([...userRoles, ...(directRole ? [directRole] : [])])];
      const isAdmin = allRoles.some(role => 
        ['admin', 'root', 'administrator'].includes(role?.toLowerCase())
      ) || (req.path?.startsWith('/admin')); // If accessing through admin route, consider as admin
      
      // Sanitize user input to prevent XSS
      const sanitizedMessage = sanitizeHtmlContent(message);
      
      // Check ticket exists
      const ticket = await ticketsCollection.findOne({ _id: new ObjectId(ticketId) });
      if (!ticket) {
        res.status(404).json({ ok: false, error: 'Ticket not found' });
        return;
      }
      
      // Check permissions
      if (!isAdmin && ticket.userId !== req.userId) {
        res.status(403).json({ ok: false, error: 'Access denied' });
        return;
      }
      
      // Create reply
      await repliesCollection.insertOne({
        ticketId,
        userId: req.userId,
        message: sanitizedMessage,
        isAdmin,
        createdAt: new Date(),
      });
      
      // Update ticket status
      const newStatus = isAdmin ? 'pending' : 'open';
      await ticketsCollection.updateOne(
        { _id: new ObjectId(ticketId) },
        {
          $set: {
            status: newStatus,
            updatedAt: new Date(),
            lastReplyAt: new Date(),
          },
        }
      );
      
      // Send email notification if admin replied
      if (isAdmin) {
        try {
          const usersCollection = db.collection('users');
          const user = await usersCollection.findOne({ _id: new ObjectId(ticket.userId) });
          
          if (user && user.email) {
            // Get admin user info for the email
            const adminUser = await usersCollection.findOne({ _id: new ObjectId(req.userId) });
            const adminName = adminUser?.firstName || adminUser?.email || 'Support Team';
            
            // Send email notification
            const emailResult = await emailTriggerService.sendTemplateEmail(
              EmailEventType.SUPPORT_TICKET_REPLY,
              user.email,
              {
                userName: user.firstName || user.email,
                ticketId: ticketId,
                ticketSubject: ticket.subject,
                adminMessage: sanitizedMessage,
                adminName: adminName,
                ticketUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/account/tickets/${ticketId}`,
              },
              {
                isImportant: true,
                skipPreferences: true, // Always send support ticket notifications
              }
            );
            
            // Check the result and log if email failed
            if (!emailResult.success) {
              console.error(`Failed to send support ticket reply email to ${user.email}:`, emailResult.error || 'Unknown error');
              console.error('Ticket ID:', ticketId, 'User ID:', ticket.userId, 'Admin ID:', req.userId);
            } else {
              console.log(`✓ Support ticket reply email sent successfully to ${user.email} for ticket ${ticketId}`);
            }
          } else {
            console.warn(`Cannot send support ticket reply email: User not found or email missing. Ticket ID: ${ticketId}, User ID: ${ticket.userId}`);
          }
        } catch (emailError) {
          console.error('Error sending support ticket reply email:', emailError);
          console.error('Ticket ID:', ticketId, 'User ID:', ticket.userId, 'Admin ID:', req.userId);
          // Don't fail the request if email fails
        }
      }
      
      res.json({
        ok: true,
        message: 'Reply sent successfully',
      });
    } catch (error) {
      console.error('Error replying to ticket:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to send reply',
      });
    }
  }

  /**
   * POST /api/tickets/:id/close
   * Close a ticket (user can close their own tickets)
   */
  static async closeTicket(req: Request, res: Response): Promise<void> {
    try {
      const db = mongo.getDb();
      const ticketsCollection = db.collection('support_tickets');
      
      const ticketId = req.params.id;
      
      const ticket = await ticketsCollection.findOne({ _id: new ObjectId(ticketId) });
      if (!ticket) {
        res.status(404).json({ ok: false, error: 'Ticket not found' });
        return;
      }
      
      // Check permissions - users can only close their own tickets
      if (ticket.userId !== req.userId) {
        res.status(403).json({ ok: false, error: 'Access denied' });
        return;
      }
      
      await ticketsCollection.updateOne(
        { _id: new ObjectId(ticketId) },
        {
          $set: {
            status: 'closed',
            updatedAt: new Date(),
          },
        }
      );
      
      res.json({
        ok: true,
        message: 'Ticket closed successfully',
      });
    } catch (error) {
      console.error('Error closing ticket:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to close ticket',
      });
    }
  }

  /**
   * POST /api/admin/support/tickets/:id/status
   * Update ticket status (admin only)
   */
  static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      // Validate input
      const validated = updateStatusSchema.parse(req.body);
      
      const db = mongo.getDb();
      const ticketsCollection = db.collection('support_tickets');
      
      const ticketId = req.params.id;
      const { status } = validated;
      
      const result = await ticketsCollection.updateOne(
        { _id: new ObjectId(ticketId) },
        {
          $set: {
            status,
            updatedAt: new Date(),
          },
        }
      );
      
      if (result.matchedCount === 0) {
        res.status(404).json({ ok: false, error: 'Ticket not found' });
        return;
      }
      
      res.json({
        ok: true,
        message: 'Ticket status updated',
      });
    } catch (error) {
      console.error('Error updating ticket status:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update ticket status',
      });
    }
  }
}

