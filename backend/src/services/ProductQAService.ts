/**
 * Product Q&A Service
 * 
 * Manages product questions and answers with moderation.
 */

import { ObjectId } from 'mongodb';
import { mongo } from '../db/Mongo';

export interface ProductQuestion {
  _id?: string;
  productId: string;
  userId: string;
  question: string;
  status: 'pending' | 'approved' | 'rejected';
  answered: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductAnswer {
  _id?: string;
  questionId: string;
  userId: string; // Can be admin, seller, or customer
  answer: string;
  isOfficial: boolean; // True if from admin/seller
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

class ProductQAService {
  /**
   * Ask a question about a product
   */
  async askQuestion(
    productId: string,
    userId: string,
    question: string
  ): Promise<ProductQuestion> {
    const db = mongo.getDb();
    const questionsCollection = db.collection<ProductQuestion>('product_questions');

    const newQuestion: ProductQuestion = {
      productId,
      userId,
      question: question.trim(),
      status: 'pending', // Requires moderation
      answered: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await questionsCollection.insertOne(newQuestion);
    newQuestion._id = result.insertedId.toString();

    return newQuestion;
  }

  /**
   * Answer a question
   */
  async answerQuestion(
    questionId: string,
    userId: string,
    answer: string,
    isOfficial = false
  ): Promise<ProductAnswer> {
    const db = mongo.getDb();
    const questionsCollection = db.collection<ProductQuestion>('product_questions');
    const answersCollection = db.collection<ProductAnswer>('product_answers');

    // Check if question exists
    const question = await questionsCollection.findOne({
      _id: new ObjectId(questionId),
    });

    if (!question) {
      throw new Error('Question not found');
    }

    const newAnswer: ProductAnswer = {
      questionId,
      userId,
      answer: answer.trim(),
      isOfficial,
      status: isOfficial ? 'approved' : 'pending', // Official answers auto-approve
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await answersCollection.insertOne(newAnswer);
    newAnswer._id = result.insertedId.toString();

    // Mark question as answered
    await questionsCollection.updateOne(
      { _id: question._id },
      {
        $set: {
          answered: true,
          updatedAt: new Date(),
        },
      }
    );

    return newAnswer;
  }

  /**
   * Get questions and answers for a product
   */
  async getProductQA(
    productId: string,
    includePending = false
  ): Promise<Array<{
    question: ProductQuestion;
    answers: ProductAnswer[];
  }>> {
    const db = mongo.getDb();
    const questionsCollection = db.collection<ProductQuestion>('product_questions');
    const answersCollection = db.collection<ProductAnswer>('product_answers');

    const query: any = { productId };
    if (!includePending) {
      query.status = 'approved';
    }

    const questions = await questionsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    const questionIds = questions.map((q) => q._id!.toString());

    const answers = await answersCollection
      .find({
        questionId: { $in: questionIds },
        ...(includePending ? {} : { status: 'approved' }),
      })
      .sort({ isOfficial: -1, createdAt: 1 }) // Official answers first, then by date
      .toArray();

    // Group answers by question
    const answersByQuestion = new Map<string, ProductAnswer[]>();
    for (const answer of answers) {
      if (!answersByQuestion.has(answer.questionId)) {
        answersByQuestion.set(answer.questionId, []);
      }
      answersByQuestion.get(answer.questionId)!.push(answer);
    }

    // Combine questions with answers
    return questions.map((question) => ({
      question,
      answers: answersByQuestion.get(question._id!.toString()) || [],
    }));
  }

  /**
   * Get user's questions
   */
  async getUserQuestions(userId: string): Promise<ProductQuestion[]> {
    const db = mongo.getDb();
    const questionsCollection = db.collection<ProductQuestion>('product_questions');

    return await questionsCollection
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
  }

  /**
   * Admin: Moderate question
   */
  async moderateQuestion(
    questionId: string,
    status: 'approved' | 'rejected'
  ): Promise<void> {
    const db = mongo.getDb();
    const questionsCollection = db.collection<ProductQuestion>('product_questions');

    await questionsCollection.updateOne(
      { _id: new ObjectId(questionId) },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      }
    );
  }

  /**
   * Admin: Moderate answer
   */
  async moderateAnswer(
    answerId: string,
    status: 'approved' | 'rejected'
  ): Promise<void> {
    const db = mongo.getDb();
    const answersCollection = db.collection<ProductAnswer>('product_answers');

    await answersCollection.updateOne(
      { _id: new ObjectId(answerId) },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      }
    );
  }

  /**
   * Admin: Get pending questions
   */
  async getPendingQuestions(limit = 50): Promise<ProductQuestion[]> {
    const db = mongo.getDb();
    const questionsCollection = db.collection<ProductQuestion>('product_questions');

    return await questionsCollection
      .find({ status: 'pending' })
      .sort({ createdAt: 1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Admin: Get pending answers
   */
  async getPendingAnswers(limit = 50): Promise<ProductAnswer[]> {
    const db = mongo.getDb();
    const answersCollection = db.collection<ProductAnswer>('product_answers');

    return await answersCollection
      .find({ status: 'pending' })
      .sort({ createdAt: 1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Delete question (admin or owner)
   */
  async deleteQuestion(questionId: string, userId?: string, isAdmin = false): Promise<void> {
    const db = mongo.getDb();
    const questionsCollection = db.collection<ProductQuestion>('product_questions');
    const answersCollection = db.collection<ProductAnswer>('product_answers');

    const query: any = { _id: new ObjectId(questionId) };
    if (!isAdmin && userId) {
      query.userId = userId;
    }

    // Delete question and its answers
    await questionsCollection.deleteOne(query);
    await answersCollection.deleteMany({ questionId });
  }

  /**
   * Delete answer (admin or owner)
   */
  async deleteAnswer(answerId: string, userId?: string, isAdmin = false): Promise<void> {
    const db = mongo.getDb();
    const answersCollection = db.collection<ProductAnswer>('product_answers');

    const query: any = { _id: new ObjectId(answerId) };
    if (!isAdmin && userId) {
      query.userId = userId;
    }

    await answersCollection.deleteOne(query);
  }
}

export const productQAService = new ProductQAService();

