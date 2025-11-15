/**
 * Seed Default Email Templates
 * 
 * Creates default email templates for common events.
 */

import { mongo } from '../src/db/Mongo';
import { EmailTemplate, EmailEventType } from '../src/models/EmailTemplate';

const defaultTemplates: Omit<EmailTemplate, '_id'>[] = [
  {
    name: 'User Registration',
    eventType: EmailEventType.USER_REGISTERED,
    subject: 'Welcome to {{siteName}}!',
    body: `
      <h2>Welcome {{userName}}!</h2>
      <p>Thank you for registering with {{siteName}}.</p>
      <p>Your account has been created successfully. You can now start shopping for amazing handmade products!</p>
      <p>If you have any questions, feel free to contact our support team.</p>
      <p>Best regards,<br>{{siteName}} Team</p>
    `,
    isProtected: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Login Alert',
    eventType: EmailEventType.USER_LOGIN_ALERT,
    subject: 'New login detected on your account',
    body: `
      <h2>New Login Detected</h2>
      <p>Hello {{userName}},</p>
      <p>We detected a new login to your account:</p>
      <ul>
        <li><strong>Time:</strong> {{loginTime}}</li>
        <li><strong>IP Address:</strong> {{ipAddress}}</li>
        <li><strong>User Agent:</strong> {{userAgent}}</li>
      </ul>
      <p>If this wasn't you, please change your password immediately and contact support.</p>
      <p>Best regards,<br>{{siteName}} Security Team</p>
    `,
    isProtected: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Password Reset',
    eventType: EmailEventType.PASSWORD_RESET,
    subject: 'Reset your password',
    body: `
      <h2>Password Reset Request</h2>
      <p>Hello {{userName}},</p>
      <p>You requested to reset your password. Click the link below to reset it:</p>
      <p><a href="{{resetLink}}">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>Best regards,<br>{{siteName}} Team</p>
    `,
    isProtected: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Email Verification',
    eventType: EmailEventType.EMAIL_VERIFICATION,
    subject: 'Verify your email address',
    body: `
      <h2>Verify Your Email</h2>
      <p>Hello {{userName}},</p>
      <p>Please verify your email address by clicking the link below:</p>
      <p><a href="{{verificationLink}}">Verify Email</a></p>
      <p>This link will expire in 24 hours.</p>
      <p>Best regards,<br>{{siteName}} Team</p>
    `,
    isProtected: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Order Confirmation',
    eventType: EmailEventType.ORDER_PLACED,
    subject: 'Order Confirmation - #{{orderId}}',
    body: `
      <h2>Order Confirmed!</h2>
      <p>Hello {{userName}},</p>
      <p>Thank you for your order! Your order #{{orderId}} has been confirmed.</p>
      <h3>Order Details:</h3>
      <ul>
        <li><strong>Order ID:</strong> {{orderId}}</li>
        <li><strong>Date:</strong> {{orderDate}}</li>
        <li><strong>Amount:</strong> {{orderAmount}}</li>
        <li><strong>Items:</strong> {{items}}</li>
      </ul>
      <p><strong>Shipping Address:</strong><br>{{shippingAddress}}</p>
      <p>We will send you tracking information once your order ships.</p>
      <p>Best regards,<br>{{siteName}} Team</p>
    `,
    isProtected: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Order Shipped',
    eventType: EmailEventType.ORDER_SHIPPED,
    subject: 'Your order #{{orderId}} has been shipped!',
    body: `
      <h2>Order Shipped!</h2>
      <p>Hello {{userName}},</p>
      <p>Great news! Your order #{{orderId}} has been shipped.</p>
      <p>You can track your shipment using the tracking number provided in your order details.</p>
      <p>Best regards,<br>{{siteName}} Team</p>
    `,
    isProtected: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Order Delivered',
    eventType: EmailEventType.ORDER_DELIVERED,
    subject: 'Your order #{{orderId}} has been delivered!',
    body: `
      <h2>Order Delivered!</h2>
      <p>Hello {{userName}},</p>
      <p>Your order #{{orderId}} has been successfully delivered!</p>
      <p>We hope you love your purchase. If you have any questions or concerns, please don't hesitate to contact us.</p>
      <p>Best regards,<br>{{siteName}} Team</p>
    `,
    isProtected: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Order Cancelled',
    eventType: EmailEventType.ORDER_CANCELLED,
    subject: 'Order #{{orderId}} has been cancelled',
    body: `
      <h2>Order Cancelled</h2>
      <p>Hello {{userName}},</p>
      <p>Your order #{{orderId}} has been cancelled.</p>
      <p>If you have any questions about this cancellation, please contact our support team.</p>
      <p>Best regards,<br>{{siteName}} Team</p>
    `,
    isProtected: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Password Changed',
    eventType: EmailEventType.PASSWORD_CHANGED,
    subject: 'Your password has been changed',
    body: `
      <h2>Password Changed</h2>
      <p>Hello {{userName}},</p>
      <p>Your password has been successfully changed.</p>
      <p>If you didn't make this change, please contact our support team immediately.</p>
      <p>Best regards,<br>{{siteName}} Security Team</p>
    `,
    isProtected: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

async function seedEmailTemplates() {
  try {
    await mongo.connect();
    const db = mongo.getDb();
    const templatesCollection = db.collection<EmailTemplate>('email_templates');
    
    // Check if templates already exist
    const existingCount = await templatesCollection.countDocuments();
    if (existingCount > 0) {
      console.log(`Email templates already exist (${existingCount} templates). Skipping seed.`);
      await mongo.disconnect();
      return;
    }
    
    // Insert default templates
    const result = await templatesCollection.insertMany(defaultTemplates);
    console.log(`✓ Seeded ${result.insertedCount} email templates`);
    
    await mongo.disconnect();
  } catch (error) {
    console.error('Error seeding email templates:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedEmailTemplates();
}

export { seedEmailTemplates };

