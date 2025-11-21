/**
 * OTP Service
 * 
 * Handles generation, validation, and expiration of One-Time Passwords
 * for email-based login and verification.
 */

import * as crypto from 'crypto';
import { mongo } from '../db/Mongo';
import { emailTriggerService } from './EmailTriggerService';
import { EmailEventType } from '../models/EmailTemplate';

interface OTPRecord {
  _id?: string;
  email: string;
  code: string; // Hashed code
  purpose: 'login' | 'verification' | 'password_reset';
  attempts: number;
  createdAt: Date;
  expiresAt: Date;
  used: boolean;
}

const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_LENGTH = 6;

class OTPService {
  /**
   * Generate a random 6-digit OTP
   */
  private generateOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Hash OTP for storage
   */
  private hashOTP(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /**
   * Verify OTP code against hashed code (private helper)
   */
  private verifyOTPCode(code: string, hashedCode: string): boolean {
    const hashed = this.hashOTP(code);
    return crypto.timingSafeEqual(
      Buffer.from(hashed),
      Buffer.from(hashedCode)
    );
  }

  /**
   * Generate and send OTP via email
   */
  async generateAndSendOTP(
    email: string,
    purpose: 'login' | 'verification' | 'password_reset' = 'login'
  ): Promise<{ success: boolean; message: string }> {
    const db = mongo.getDb();
    const otpCollection = db.collection<OTPRecord>('otps');

    // Clean up expired OTPs for this email
    await otpCollection.deleteMany({
      email,
      expiresAt: { $lt: new Date() },
    });

    // Check for existing unused OTP
    const existing = await otpCollection.findOne({
      email,
      purpose,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    // Rate limiting: prevent too many OTP requests
    if (existing) {
      const timeSinceCreation = Date.now() - existing.createdAt.getTime();
      const cooldownMs = 60 * 1000; // 1 minute cooldown
      
      if (timeSinceCreation < cooldownMs) {
        return {
          success: false,
          message: 'Please wait before requesting another OTP',
        };
      }
    }

    // Generate new OTP
    const code = this.generateOTP();
    const hashedCode = this.hashOTP(code);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    // Store OTP
    const otpRecord: OTPRecord = {
      email,
      code: hashedCode,
      purpose,
      attempts: 0,
      createdAt: new Date(),
      expiresAt,
      used: false,
    };

    await otpCollection.insertOne(otpRecord);

    // Send OTP email
    try {
      const emailResult = await emailTriggerService.sendTemplateEmail(
        purpose === 'login' 
          ? EmailEventType.OTP_LOGIN 
          : EmailEventType.EMAIL_VERIFICATION,
        email,
        {
          otpCode: code,
          expiresInMinutes: OTP_EXPIRY_MINUTES,
        },
        {
          isImportant: true,
          skipPreferences: true,
        }
      );

      if (!emailResult.success) {
        console.error('Failed to send OTP email:', emailResult.error);
        // Clean up OTP record if email fails
        await otpCollection.deleteOne({ _id: otpRecord._id });
        
        return {
          success: false,
          message: emailResult.error || 'Failed to send OTP. Please check your email configuration.',
        };
      }

      return {
        success: true,
        message: 'OTP sent to your email',
      };
    } catch (error) {
      console.error('Failed to send OTP email:', error);
      // Clean up OTP record if email fails
      await otpCollection.deleteOne({ _id: otpRecord._id });
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send OTP. Please try again.',
      };
    }
  }

  /**
   * Verify OTP code
   * @param markAsUsed If false, don't mark OTP as used (useful when 2FA is also required)
   */
  async verifyOTP(
    email: string,
    code: string,
    purpose: 'login' | 'verification' | 'password_reset' = 'login',
    markAsUsed: boolean = true
  ): Promise<{ valid: boolean; message: string }> {
    const db = mongo.getDb();
    const otpCollection = db.collection<OTPRecord>('otps');

    // Find OTP record
    const otpRecord = await otpCollection.findOne({
      email,
      purpose,
      used: false,
    });

    if (!otpRecord) {
      return {
        valid: false,
        message: 'Invalid or expired OTP',
      };
    }

    // Check expiration
    if (otpRecord.expiresAt < new Date()) {
      await otpCollection.deleteOne({ _id: otpRecord._id });
      return {
        valid: false,
        message: 'OTP has expired',
      };
    }

    // Check attempts
    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
      await otpCollection.deleteOne({ _id: otpRecord._id });
      return {
        valid: false,
        message: 'Too many failed attempts. Please request a new OTP',
      };
    }

    // Verify code
    const isValid = this.verifyOTPCode(code, otpRecord.code);

    if (!isValid) {
      // Increment attempts
      await otpCollection.updateOne(
        { _id: otpRecord._id },
        { $inc: { attempts: 1 } }
      );

      const remainingAttempts = OTP_MAX_ATTEMPTS - otpRecord.attempts - 1;
      return {
        valid: false,
        message: `Invalid OTP. ${remainingAttempts} attempt(s) remaining`,
      };
    }

    // Mark as used only if markAsUsed is true
    if (markAsUsed) {
      await otpCollection.updateOne(
        { _id: otpRecord._id },
        { $set: { used: true } }
      );
    }

    // Clean up old OTPs for this email
    await otpCollection.deleteMany({
      email,
      purpose,
      used: true,
      createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Older than 24h
    });

    return {
      valid: true,
      message: 'OTP verified successfully',
    };
  }

  /**
   * Clean up expired OTPs (should be called periodically)
   */
  async cleanupExpiredOTPs(): Promise<number> {
    const db = mongo.getDb();
    const otpCollection = db.collection<OTPRecord>('otps');

    const result = await otpCollection.deleteMany({
      $or: [
        { expiresAt: { $lt: new Date() } },
        { used: true, createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      ],
    });

    return result.deletedCount || 0;
  }
}

export const otpService = new OTPService();

