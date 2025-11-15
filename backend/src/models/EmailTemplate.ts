/**
 * Email Template Model
 * 
 * Defines the structure for email templates stored in MongoDB.
 */

export interface EmailTemplate {
  _id?: string;
  name: string; // e.g., "Order Confirmation"
  eventType: string; // e.g., "ORDER_PLACED", "USER_REGISTERED", "PASSWORD_RESET"
  subject: string; // Email subject with placeholders like {{orderId}}
  body: string; // HTML email body with placeholders
  isProtected: boolean; // If true, cannot be disabled by user preferences
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Email event types
 */
export enum EmailEventType {
  USER_REGISTERED = 'USER_REGISTERED',
  USER_LOGIN_ALERT = 'USER_LOGIN_ALERT',
  PASSWORD_RESET = 'PASSWORD_RESET',
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  ORDER_PLACED = 'ORDER_PLACED',
  ORDER_PAID = 'ORDER_PAID',
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
}

