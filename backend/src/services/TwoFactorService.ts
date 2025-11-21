/**
 * Two-Factor Authentication (2FA) Service
 * 
 * Implements TOTP (Time-based One-Time Password) using RFC 6238.
 * Supports Google Authenticator, Authy, and similar TOTP apps.
 */

import * as crypto from 'crypto';
import { mongo } from '../db/Mongo';
import { ObjectId } from 'mongodb';

interface TwoFactorSecret {
  _id?: string;
  userId: string;
  secret: string; // Base32 encoded secret
  backupCodes: string[]; // Hashed backup codes
  enabled: boolean;
  createdAt: Date;
  lastUsed?: Date;
}

const TOTP_PERIOD = 30; // 30 seconds
const TOTP_DIGITS = 6;
const BACKUP_CODES_COUNT = 10;

class TwoFactorService {
  /**
   * Generate a new TOTP secret for a user
   */
  async generateSecret(userId: string, userEmail?: string): Promise<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  }> {
    const db = mongo.getDb();
    const twoFactorCollection = db.collection<TwoFactorSecret>('two_factor_secrets');

    // Generate random secret (16 bytes = 128 bits)
    const secretBytes = crypto.randomBytes(16);
    const secret = this.base32Encode(secretBytes);

    // Generate backup codes
    const backupCodes: string[] = [];
    const backupCodesHashed: string[] = [];

    for (let i = 0; i < BACKUP_CODES_COUNT; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      backupCodes.push(code);
      backupCodesHashed.push(this.hashBackupCode(code));
    }

    // Store secret (not enabled yet - user must verify first)
    await twoFactorCollection.updateOne(
      { userId },
      {
        $set: {
          userId,
          secret,
          backupCodes: backupCodesHashed,
          enabled: false,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    // Generate QR code URL for authenticator apps
    // Use email if available, otherwise use userId
    const issuer = 'Handmade Harmony';
    const accountName = userEmail || userId;
    const qrCodeUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;

    return {
      secret,
      qrCodeUrl,
      backupCodes,
    };
  }

  /**
   * Verify TOTP code
   */
  async verifyCode(userId: string, code: string, isBackupCode = false): Promise<boolean> {
    const db = mongo.getDb();
    const twoFactorCollection = db.collection<TwoFactorSecret>('two_factor_secrets');

    const record = await twoFactorCollection.findOne({ userId, enabled: true });

    if (!record) {
      return false;
    }

    if (isBackupCode) {
      // Verify backup code
      const codeHash = this.hashBackupCode(code);
      const index = record.backupCodes.indexOf(codeHash);

      if (index === -1) {
        return false;
      }

      // Remove used backup code
      record.backupCodes.splice(index, 1);
      await twoFactorCollection.updateOne(
        { userId },
        { $set: { backupCodes: record.backupCodes, lastUsed: new Date() } }
      );

      return true;
    }

    // Verify TOTP code
    try {
      const isValid = this.verifyTOTP(record.secret, code);

      if (isValid) {
        await twoFactorCollection.updateOne(
          { userId },
          { $set: { lastUsed: new Date() } }
        );
      }

      return isValid;
    } catch (error) {
      // If any error occurs during verification (invalid code format, corrupted secret, etc.),
      // treat it as an invalid code rather than throwing a 500 error
      console.error('Error verifying 2FA code:', error);
      return false;
    }
  }

  /**
   * Enable 2FA for a user (after they verify the code)
   */
  async enable(userId: string, verificationCode: string): Promise<boolean> {
    const db = mongo.getDb();
    const twoFactorCollection = db.collection<TwoFactorSecret>('two_factor_secrets');

    const record = await twoFactorCollection.findOne({ userId, enabled: false });

    if (!record) {
      return false;
    }

    // Verify the code before enabling
    const isValid = this.verifyTOTP(record.secret, verificationCode);

    if (!isValid) {
      return false;
    }

    // Enable 2FA
    await twoFactorCollection.updateOne(
      { userId },
      { $set: { enabled: true, lastUsed: new Date() } }
    );

    return true;
  }

  /**
   * Disable 2FA for a user
   */
  async disable(userId: string): Promise<void> {
    const db = mongo.getDb();
    const twoFactorCollection = db.collection<TwoFactorSecret>('two_factor_secrets');

    await twoFactorCollection.deleteOne({ userId });
  }

  /**
   * Check if 2FA is enabled for a user
   */
  async isEnabled(userId: string): Promise<boolean> {
    const db = mongo.getDb();
    const twoFactorCollection = db.collection<TwoFactorSecret>('two_factor_secrets');

    const record = await twoFactorCollection.findOne({ userId, enabled: true });
    return !!record;
  }

  /**
   * Get remaining backup codes count
   */
  async getBackupCodesCount(userId: string): Promise<number> {
    const db = mongo.getDb();
    const twoFactorCollection = db.collection<TwoFactorSecret>('two_factor_secrets');

    const record = await twoFactorCollection.findOne({ userId, enabled: true });
    return record?.backupCodes.length || 0;
  }

  /**
   * Verify TOTP code against secret
   */
  private verifyTOTP(secret: string, code: string): boolean {
    try {
      // Validate code format - must be exactly 6 digits
      if (!code || !/^\d{6}$/.test(code)) {
        return false;
      }

      const time = Math.floor(Date.now() / 1000 / TOTP_PERIOD);

      // Check current time window and ±1 window for clock skew tolerance
      for (let offset = -1; offset <= 1; offset++) {
        const timeWindow = time + offset;
        const expectedCode = this.generateTOTP(secret, timeWindow);

        // Ensure both buffers are the same length before comparing
        const codeBuffer = Buffer.from(code);
        const expectedBuffer = Buffer.from(expectedCode);
        
        if (codeBuffer.length !== expectedBuffer.length) {
          continue;
        }

        if (crypto.timingSafeEqual(codeBuffer, expectedBuffer)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      // If any error occurs (invalid secret, decoding error, etc.), return false
      console.error('Error in verifyTOTP:', error);
      return false;
    }
  }

  /**
   * Generate TOTP code for a given time window
   */
  private generateTOTP(secret: string, timeWindow: number): string {
    try {
      const secretBytes = this.base32Decode(secret);
      const timeBuffer = Buffer.allocUnsafe(8);
      timeBuffer.writeUInt32BE(0, 0);
      timeBuffer.writeUInt32BE(timeWindow, 4);

      const hmac = crypto.createHmac('sha1', secretBytes);
      hmac.update(timeBuffer);
      const hash = hmac.digest();

      const offset = hash[hash.length - 1] & 0x0f;
      const binary =
        ((hash[offset] & 0x7f) << 24) |
        ((hash[offset + 1] & 0xff) << 16) |
        ((hash[offset + 2] & 0xff) << 8) |
        (hash[offset + 3] & 0xff);

      const otp = (binary % Math.pow(10, TOTP_DIGITS)).toString();
      return otp.padStart(TOTP_DIGITS, '0');
    } catch (error) {
      // If secret is invalid or decoding fails, throw to be caught by verifyTOTP
      throw new Error(`Failed to generate TOTP: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Base32 encode (RFC 4648)
   */
  private base32Encode(buffer: Buffer): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;

      while (bits >= 5) {
        output += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      output += alphabet[(value << (5 - bits)) & 31];
    }

    return output;
  }

  /**
   * Base32 decode
   */
  private base32Decode(encoded: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const encodedUpper = encoded.toUpperCase().replace(/=+$/, '');
    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (let i = 0; i < encodedUpper.length; i++) {
      const char = encodedUpper[i];
      const index = alphabet.indexOf(char);

      if (index === -1) {
        throw new Error(`Invalid base32 character: ${char}`);
      }

      value = (value << 5) | index;
      bits += 5;

      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }

    return Buffer.from(output);
  }

  /**
   * Hash backup code for storage
   */
  private hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }
}

export const twoFactorService = new TwoFactorService();

