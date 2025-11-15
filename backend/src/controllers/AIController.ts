/**
 * AI Controller
 * 
 * Handles AI chat requests and product assistance.
 */

import { Request, Response } from 'express';
import { aiService } from '../services/AIService';
import { generalRateLimiter } from '../middleware/Security';

export class AIController {
  /**
   * Chat with AI assistant
   * POST /api/ai/chat
   */
  static async chat(req: Request, res: Response): Promise<void> {
    try {
      const { message, conversationHistory = [] } = req.body;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        res.status(400).json({
          ok: false,
          error: 'Message is required',
        });
        return;
      }

      // Validate conversation history format
      const history = Array.isArray(conversationHistory) 
        ? conversationHistory.filter((msg: any) => 
            msg && 
            typeof msg.role === 'string' && 
            typeof msg.content === 'string' &&
            (msg.role === 'user' || msg.role === 'assistant')
          )
        : [];

      // Add current message to history
      const messages = [
        ...history,
        { role: 'user' as const, content: message.trim() },
      ];

      // Limit conversation history to last 10 messages to avoid token limits
      const recentMessages = messages.slice(-10);

      // Get AI response
      const aiResponse = await aiService.chat(recentMessages);

      res.json({
        ok: true,
        data: {
          message: aiResponse.message,
          suggestions: aiResponse.suggestions,
        },
      });
    } catch (error) {
      console.error('Error in AI chat:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to process chat request',
      });
    }
  }

  /**
   * Get product recommendations
   * GET /api/ai/recommendations?q=query
   */
  static async getRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query.q as string;

      if (!query || query.trim().length === 0) {
        res.status(400).json({
          ok: false,
          error: 'Query parameter is required',
        });
        return;
      }

      const recommendations = await aiService.getRecommendations(query);

      res.json({
        ok: true,
        data: {
          recommendations,
        },
      });
    } catch (error) {
      console.error('Error getting recommendations:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to get recommendations',
      });
    }
  }
}

