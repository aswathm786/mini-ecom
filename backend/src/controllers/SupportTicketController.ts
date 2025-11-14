/**
 * Support Ticket Controller
 * 
 * Handles support ticket operations for both users and admins.
 */

import { Request, Response } from 'express';
import { mongo } from '../db/Mongo';
import { ObjectId } from 'mongodb';
import { parsePagination, getPaginationMeta } from '../helpers/pagination';

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
      const isAdmin = (req.user as any)?.role === 'admin';
      
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
      
      // Get tickets
      const tickets = await ticketsCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .toArray();
      
      const total = await ticketsCollection.countDocuments(query);
      
      // Populate user emails for admin view
      if (isAdmin) {
        const userIds = [...new Set(tickets.map(t => t.userId))];
        const users = await usersCollection
          .find({ _id: { $in: userIds.map(id => new ObjectId(id)) } })
          .toArray();
        const userMap = new Map(users.map(u => [u._id.toString(), u.email]));
        
        tickets.forEach(ticket => {
          (ticket as any).userEmail = userMap.get(ticket.userId);
        });
      }
      
      // Get reply counts
      const repliesCollection = db.collection('support_ticket_replies');
      for (const ticket of tickets) {
        const replyCount = await repliesCollection.countDocuments({ ticketId: ticket._id.toString() });
        (ticket as any).replyCount = replyCount;
      }
      
      res.json({
        ok: true,
        data: tickets,
        total,
        pages: Math.ceil(total / pagination.limit),
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
      const isAdmin = (req.user as any)?.role === 'admin';
      
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
      
      // Get replies
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
        ...reply,
        userEmail: userMap.get(reply.userId),
        isAdmin: (reply as any).isAdmin || false,
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
      
      const db = mongo.getDb();
      const ticketsCollection = db.collection('support_tickets');
      
      const { subject, message, priority = 'medium' } = req.body;
      
      if (!subject || !message) {
        res.status(400).json({ ok: false, error: 'Subject and message are required' });
        return;
      }
      
      const ticket = {
        userId: req.userId,
        subject,
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
        message,
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
      const db = mongo.getDb();
      const ticketsCollection = db.collection('support_tickets');
      const repliesCollection = db.collection('support_ticket_replies');
      
      const ticketId = req.params.id;
      const { message } = req.body;
      const isAdmin = (req.user as any)?.role === 'admin';
      
      if (!message) {
        res.status(400).json({ ok: false, error: 'Message is required' });
        return;
      }
      
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
        message,
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
   * POST /api/admin/support/tickets/:id/status
   * Update ticket status (admin only)
   */
  static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const db = mongo.getDb();
      const ticketsCollection = db.collection('support_tickets');
      
      const ticketId = req.params.id;
      const { status } = req.body;
      
      const validStatuses = ['open', 'pending', 'resolved', 'closed'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({ ok: false, error: 'Invalid status' });
        return;
      }
      
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

