/**
 * Product Q&A Controller
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { productQAService } from '../services/ProductQAService';

const askQuestionSchema = z.object({
  question: z.string().min(1).max(1000),
});

const answerQuestionSchema = z.object({
  answer: z.string().min(1).max(2000),
  isOfficial: z.boolean().optional(),
});

export class ProductQAController {
  static async askQuestion(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ ok: false, error: 'Authentication required' });
        return;
      }

      const { productId } = req.params;
      const validated = askQuestionSchema.parse(req.body);

      const question = await productQAService.askQuestion(
        productId,
        req.userId,
        validated.question
      );

      res.status(201).json({ ok: true, data: question });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ ok: false, error: 'Validation failed', details: error.errors });
        return;
      }
      console.error('Error asking question:', error);
      res.status(500).json({ ok: false, error: 'Failed to ask question' });
    }
  }

  static async answerQuestion(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ ok: false, error: 'Authentication required' });
        return;
      }

      const { questionId } = req.params;
      const validated = answerQuestionSchema.parse(req.body);
      const isAdmin = (req.user as any)?.role === 'admin' || (req.user as any)?.role === 'root';

      const answer = await productQAService.answerQuestion(
        questionId,
        req.userId,
        validated.answer,
        validated.isOfficial || isAdmin
      );

      res.status(201).json({ ok: true, data: answer });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ ok: false, error: 'Validation failed', details: error.errors });
        return;
      }
      console.error('Error answering question:', error);
      res.status(500).json({ ok: false, error: 'Failed to answer question' });
    }
  }

  static async getProductQA(req: Request, res: Response): Promise<void> {
    try {
      const { productId } = req.params;
      const includePending = req.query.includePending === 'true';

      const qa = await productQAService.getProductQA(productId, includePending);

      res.json({ ok: true, data: qa });
    } catch (error) {
      console.error('Error getting Q&A:', error);
      res.status(500).json({ ok: false, error: 'Failed to get Q&A' });
    }
  }

  static async getUserQuestions(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ ok: false, error: 'Authentication required' });
        return;
      }

      const questions = await productQAService.getUserQuestions(req.userId);
      res.json({ ok: true, data: questions });
    } catch (error) {
      console.error('Error getting user questions:', error);
      res.status(500).json({ ok: false, error: 'Failed to get questions' });
    }
  }

  static async moderateQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { questionId } = req.params;
      const { status } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        res.status(400).json({ ok: false, error: 'Invalid status' });
        return;
      }

      await productQAService.moderateQuestion(questionId, status);
      res.json({ ok: true, message: 'Question moderated' });
    } catch (error) {
      console.error('Error moderating question:', error);
      res.status(500).json({ ok: false, error: 'Failed to moderate question' });
    }
  }

  static async moderateAnswer(req: Request, res: Response): Promise<void> {
    try {
      const { answerId } = req.params;
      const { status } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        res.status(400).json({ ok: false, error: 'Invalid status' });
        return;
      }

      await productQAService.moderateAnswer(answerId, status);
      res.json({ ok: true, message: 'Answer moderated' });
    } catch (error) {
      console.error('Error moderating answer:', error);
      res.status(500).json({ ok: false, error: 'Failed to moderate answer' });
    }
  }

  static async getPendingQuestions(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const questions = await productQAService.getPendingQuestions(limit);
      res.json({ ok: true, data: questions });
    } catch (error) {
      console.error('Error getting pending questions:', error);
      res.status(500).json({ ok: false, error: 'Failed to get pending questions' });
    }
  }

  static async getPendingAnswers(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const answers = await productQAService.getPendingAnswers(limit);
      res.json({ ok: true, data: answers });
    } catch (error) {
      console.error('Error getting pending answers:', error);
      res.status(500).json({ ok: false, error: 'Failed to get pending answers' });
    }
  }
}

