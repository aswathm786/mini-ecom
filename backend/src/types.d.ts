/**
 * Shared TypeScript type definitions for Handmade Harmony backend
 */

export interface User {
  _id?: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  isEmailVerified: boolean;
  role?: string;
  status?: 'active' | 'suspended' | 'deleted';
  emailPreferences?: {
    marketing?: boolean;
    newsletter?: boolean;
    transactional?: boolean;
    [eventType: string]: boolean | undefined;
  };
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  userId: string;
  token: string;
  refreshToken?: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  fingerprint?: string;
  csrfToken?: string;
  createdAt: Date;
  expiresAt: Date;
  refreshExpiresAt?: Date;
}

export interface WebhookEvent {
  _id?: string;
  source: "razorpay" | "delhivery" | "other";
  eventType: string;
  payload: any;
  signature?: string;
  signatureValid?: boolean;
  headers?: Record<string, string>;
  idempotencyKey?: string;
  processed: boolean;
  processedAt?: Date;
  error?: string;
  createdAt: Date;
}

export interface AuditLog {
  _id?: string;
  actorId?: string;
  actorType: "user" | "system";
  action: string;
  objectType?: string;
  objectId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface Setting {
  _id?: string;
  key: string;
  value: any;
  type: "string" | "number" | "boolean" | "json";
  description?: string;
  updatedAt: Date;
  updatedBy?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: User;
      sessionId?: string;
    }
  }
}
