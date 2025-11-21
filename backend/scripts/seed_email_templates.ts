/**
 * Seed Default Email Templates
 * 
 * Creates default email templates for common events.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { mongo } from '../src/db/Mongo';
import { EmailTemplate, EmailEventType } from '../src/models/EmailTemplate';

const defaultTemplates: Omit<EmailTemplate, '_id'>[] = [
  {
    name: 'User Registration',
    eventType: EmailEventType.USER_REGISTERED,
    subject: '🎉 Welcome to {{siteName}}!',
    body: `
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 32px;">🎉 Welcome!</h1>
        <p style="color: rgba(255,255,255,0.95); margin: 15px 0 0 0; font-size: 18px;">Your account is ready</p>
      </div>
      
      <div style="padding: 40px 20px;">
        <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hello <strong>{{userName}}</strong>,</p>
        
        <p style="font-size: 16px; color: #555; line-height: 1.8;">
          Thank you for joining <strong>{{siteName}}</strong>! We're thrilled to have you as part of our community. Your account has been successfully created and you're all set to explore our collection of amazing handmade products.
        </p>

        <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 25px; margin: 30px 0; border-radius: 4px;">
          <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 18px;">✨ What You Can Do Now</h3>
          <ul style="margin: 0; padding-left: 20px; color: #1e3a8a; line-height: 2;">
            <li>Browse our curated collection of handmade products</li>
            <li>Add items to your wishlist</li>
            <li>Enjoy exclusive member benefits and offers</li>
            <li>Track your orders in real-time</li>
            <li>Get personalized product recommendations</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 40px 0;">
          <a href="{{siteUrl}}/products" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
            🛍️ Start Shopping
          </a>
        </div>

        <div style="background: #fef3c7; border-radius: 8px; padding: 25px; margin: 30px 0; text-align: center;">
          <h4 style="margin: 0 0 10px 0; color: #78350f; font-size: 16px;">🎁 First Order Bonus</h4>
          <p style="margin: 0; color: #92400e; font-size: 15px; line-height: 1.6;">
            Use code <strong style="background: white; padding: 6px 12px; border-radius: 4px; font-size: 18px;">WELCOME10</strong> to get <strong>10% off</strong> on your first order!
          </p>
        </div>

        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 30px;">
          Need help getting started? Our support team is here to assist you. Feel free to reach out anytime!
        </p>

        <p style="color: #333; font-size: 15px; margin-top: 30px;">
          Happy shopping!<br>
          <strong>{{siteName}} Team</strong>
        </p>
      </div>
    `,
    isProtected: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Login Alert',
    eventType: EmailEventType.USER_LOGIN_ALERT,
    subject: '🔐 New login detected on your account',
    body: `
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 35px 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Security Alert</h1>
        <p style="color: rgba(255,255,255,0.95); margin: 12px 0 0 0; font-size: 16px;">New login detected</p>
      </div>
      
      <div style="padding: 35px 20px;">
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hello <strong>{{userName}}</strong>,</p>
        
        <p style="font-size: 15px; color: #555; line-height: 1.7;">
          We detected a new login to your account. If this was you, you can safely ignore this email.
        </p>

        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 25px; margin: 25px 0; border-radius: 4px;">
          <h3 style="margin: 0 0 15px 0; color: #78350f; font-size: 18px;">📍 Login Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; color: #92400e; font-size: 14px; font-weight: 600;">Time:</td>
              <td style="padding: 10px 0; color: #78350f; font-size: 14px;">{{loginTime}}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #92400e; font-size: 14px; font-weight: 600;">IP Address:</td>
              <td style="padding: 10px 0; color: #78350f; font-size: 14px; font-family: monospace;">{{ipAddress}}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #92400e; font-size: 14px; font-weight: 600;">Device:</td>
              <td style="padding: 10px 0; color: #78350f; font-size: 13px;">{{userAgent}}</td>
            </tr>
          </table>
        </div>

        <div style="background: #fee2e2; border: 2px solid #ef4444; border-radius: 8px; padding: 25px; margin: 25px 0;">
          <h4 style="margin: 0 0 12px 0; color: #991b1b; font-size: 16px;">⚠️ Didn't recognize this login?</h4>
          <p style="margin: 0 0 20px 0; color: #7f1d1d; font-size: 14px; line-height: 1.6;">
            If this wasn't you, your account security may be compromised. Please take immediate action:
          </p>
          <ol style="margin: 0; padding-left: 20px; color: #991b1b; line-height: 2;">
            <li>Change your password immediately</li>
            <li>Review your recent account activity</li>
            <li>Enable two-factor authentication</li>
            <li>Contact our security team</li>
          </ol>
        </div>

        <div style="text-align: center; margin: 35px 0;">
          <a href="{{siteUrl}}/account/security" style="display: inline-block; background: #ef4444; color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px rgba(239, 68, 68, 0.3);">
            🔒 Secure My Account
          </a>
        </div>

        <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin-top: 30px; text-align: center;">
          This is an automated security notification. If you have concerns, please contact support immediately.
        </p>

        <p style="color: #333; font-size: 15px; margin-top: 25px;">
          Stay safe,<br>
          <strong>{{siteName}} Security Team</strong>
        </p>
      </div>
    `,
    isProtected: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Password Reset',
    eventType: EmailEventType.PASSWORD_RESET,
    subject: '🔑 Password Reset Request - {{siteName}}',
    body: `
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 35px 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🔑 Reset Your Password</h1>
        <p style="color: rgba(255,255,255,0.95); margin: 12px 0 0 0; font-size: 16px;">Let's get you back in</p>
      </div>
      
      <div style="padding: 35px 20px;">
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hello <strong>{{userName}}</strong>,</p>
        
        <p style="font-size: 15px; color: #555; line-height: 1.7;">
          We received a request to reset the password for your account. No worries, it happens to the best of us! Click the button below to create a new password.
        </p>

        <div style="text-align: center; margin: 40px 0;">
          <a href="{{resetLink}}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 16px 45px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
            🔓 Reset Password
          </a>
        </div>

        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 4px;">
          <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">
            ⏰ <strong>Important:</strong> This password reset link will expire in <strong>1 hour</strong> for security reasons.
          </p>
        </div>

        <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 25px 0;">
          <h4 style="margin: 0 0 12px 0; color: #374151; font-size: 15px;">🔗 Link not working?</h4>
          <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="margin: 0; padding: 10px; background: white; border-radius: 4px; word-break: break-all; font-size: 12px; color: #3b82f6; font-family: monospace;">
            {{resetLink}}
          </p>
        </div>

        <div style="background: #fee2e2; border-radius: 8px; padding: 20px; margin: 25px 0;">
          <h4 style="margin: 0 0 10px 0; color: #991b1b; font-size: 15px;">❌ Didn't request this?</h4>
          <p style="margin: 0; color: #7f1d1d; font-size: 14px; line-height: 1.6;">
            If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </p>
        </div>

        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 30px;">
          For security reasons, we never send unsolicited password reset emails. If you received this unexpectedly, someone may have tried to access your account.
        </p>

        <p style="color: #333; font-size: 15px; margin-top: 25px;">
          Stay secure,<br>
          <strong>{{siteName}} Team</strong>
        </p>
      </div>
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
    name: 'OTP Login',
    eventType: EmailEventType.OTP_LOGIN,
    subject: 'Your login OTP code',
    body: `
      <h2>Your Login OTP Code</h2>
      <p>Hello,</p>
      <p>You requested a one-time password to log in to your account.</p>
      <div style="background-color: #f0f0f0; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center;">
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 0; font-family: monospace;">{{otpCode}}</p>
      </div>
      <p><strong>This code will expire in {{expiresInMinutes}} minutes.</strong></p>
      <p>If you didn't request this OTP, please ignore this email or contact support if you have concerns.</p>
      <p>Best regards,<br>{{siteName}} Team</p>
    `,
    isProtected: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Order Confirmation',
    eventType: EmailEventType.ORDER_PLACED,
    subject: '✅ Order Confirmed - #{{orderId}}',
    body: `
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Order Confirmed!</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Thank you for your purchase</p>
      </div>
      
      <div style="padding: 30px 20px;">
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hello <strong>{{userName}}</strong>,</p>
        
        <p style="font-size: 15px; color: #555; line-height: 1.6;">
          Your order has been successfully placed and is being processed. We've attached your invoice to this email for your records.
        </p>

        <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 25px 0; border-radius: 4px;">
          <h3 style="margin: 0 0 15px 0; color: #667eea; font-size: 18px;">📦 Order Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; font-size: 14px;">Order ID:</td>
              <td style="padding: 8px 0; color: #333; font-weight: 600; text-align: right; font-size: 14px;">#{{orderId}}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-size: 14px;">Order Date:</td>
              <td style="padding: 8px 0; color: #333; font-weight: 600; text-align: right; font-size: 14px;">{{orderDate}}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-size: 14px;">Order Status:</td>
              <td style="padding: 8px 0; text-align: right;"><span style="background: #10b981; color: white; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 500;">{{orderStatus}}</span></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-size: 14px;">Payment Method:</td>
              <td style="padding: 8px 0; color: #333; font-weight: 600; text-align: right; font-size: 14px; text-transform: uppercase;">{{paymentMethod}}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-size: 14px;">Payment Status:</td>
              <td style="padding: 8px 0; text-align: right;"><span style="background: #f59e0b; color: white; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 500;">{{paymentStatus}}</span></td>
            </tr>
          </table>
        </div>

        <h3 style="color: #333; font-size: 18px; margin: 30px 0 15px 0;">🛍️ Order Items</h3>
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                <th style="padding: 12px 15px; text-align: left; color: #666; font-weight: 600; font-size: 13px;">PRODUCT</th>
                <th style="padding: 12px 15px; text-align: center; color: #666; font-weight: 600; font-size: 13px;">QTY</th>
                <th style="padding: 12px 15px; text-align: right; color: #666; font-weight: 600; font-size: 13px;">PRICE</th>
                <th style="padding: 12px 15px; text-align: right; color: #666; font-weight: 600; font-size: 13px;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {{#each items}}
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 15px; color: #333; font-size: 14px;">{{name}}</td>
                <td style="padding: 15px; text-align: center; color: #666; font-size: 14px;">×{{qty}}</td>
                <td style="padding: 15px; text-align: right; color: #666; font-size: 14px;">₹{{priceAt}}</td>
                <td style="padding: 15px; text-align: right; color: #333; font-weight: 600; font-size: 14px;">₹{{itemTotal}}</td>
              </tr>
              {{/each}}
            </tbody>
          </table>
        </div>

        <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 25px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #92400e; font-size: 14px;">Subtotal:</td>
              <td style="padding: 8px 0; text-align: right; color: #92400e; font-size: 14px;">₹{{subtotal}}</td>
            </tr>
            {{#if discount}}
            <tr>
              <td style="padding: 8px 0; color: #16a34a; font-size: 14px;">Discount:</td>
              <td style="padding: 8px 0; text-align: right; color: #16a34a; font-size: 14px;">-₹{{discount}}</td>
            </tr>
            {{/if}}
            <tr>
              <td style="padding: 8px 0; color: #92400e; font-size: 14px;">Shipping:</td>
              <td style="padding: 8px 0; text-align: right; color: #92400e; font-size: 14px;">₹{{shippingCost}}</td>
            </tr>
            <tr style="border-top: 2px solid #f59e0b;">
              <td style="padding: 15px 0 0 0; color: #78350f; font-size: 18px; font-weight: 700;">Total Amount:</td>
              <td style="padding: 15px 0 0 0; text-align: right; color: #78350f; font-size: 20px; font-weight: 700;">{{orderAmount}}</td>
            </tr>
          </table>
        </div>

        <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 4px;">
          <h3 style="margin: 0 0 10px 0; color: #1e40af; font-size: 16px;">📍 Shipping Address</h3>
          <p style="margin: 0; color: #1e3a8a; line-height: 1.6; font-size: 14px; white-space: pre-line;">{{shippingAddress}}</p>
        </div>

        <div style="text-align: center; margin: 35px 0;">
          <a href="{{siteUrl}}/account/orders/{{orderId}}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
            📦 View Order Details
          </a>
        </div>

        <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 25px 0;">
          <h4 style="margin: 0 0 10px 0; color: #374151; font-size: 15px;">📄 Invoice Attached</h4>
          <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
            Your invoice has been attached to this email. You can also download it anytime from your order details page.
          </p>
        </div>

        <div style="background: #ecfdf5; border-radius: 8px; padding: 20px; margin: 25px 0;">
          <h4 style="margin: 0 0 10px 0; color: #065f46; font-size: 15px;">🚚 What's Next?</h4>
          <p style="margin: 0; color: #047857; font-size: 14px; line-height: 1.6;">
            We're preparing your order for shipment. You'll receive another email with tracking information once your order ships. 
            Expected delivery: <strong>3-5 business days</strong>.
          </p>
        </div>

        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 30px;">
          If you have any questions about your order, please don't hesitate to contact our support team.
        </p>

        <p style="color: #333; font-size: 15px; margin-top: 25px;">
          Thank you for shopping with us!<br>
          <strong>{{siteName}} Team</strong>
        </p>
      </div>
    `,
    isProtected: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Order Shipped',
    eventType: EmailEventType.ORDER_SHIPPED,
    subject: '📦 Your order is on its way! - #{{orderId}}',
    body: `
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 35px 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">📦 Order Shipped!</h1>
        <p style="color: rgba(255,255,255,0.95); margin: 12px 0 0 0; font-size: 16px;">Your package is on the way</p>
      </div>
      
      <div style="padding: 35px 20px;">
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hello <strong>{{userName}}</strong>,</p>
        
        <p style="font-size: 15px; color: #555; line-height: 1.7;">
          Great news! Your order has been shipped and is on its way to you. Get ready to receive your amazing products!
        </p>

        <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 25px; margin: 25px 0; border-radius: 4px;">
          <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 18px;">📋 Shipping Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; color: #047857; font-size: 14px; font-weight: 600;">Order ID:</td>
              <td style="padding: 10px 0; color: #065f46; font-size: 14px;">#{{orderId}}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #047857; font-size: 14px; font-weight: 600;">Tracking Number:</td>
              <td style="padding: 10px 0; color: #065f46; font-size: 14px; font-family: monospace; font-weight: 600;">{{trackingNumber}}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #047857; font-size: 14px; font-weight: 600;">Carrier:</td>
              <td style="padding: 10px 0; color: #065f46; font-size: 14px;">{{carrier}}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #047857; font-size: 14px; font-weight: 600;">Estimated Delivery:</td>
              <td style="padding: 10px 0; color: #065f46; font-size: 14px; font-weight: 600;">{{estimatedDelivery}}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 35px 0;">
          <a href="{{trackingUrl}}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
            📍 Track Your Package
          </a>
        </div>

        <div style="background: #f0f9ff; border-radius: 8px; padding: 20px; margin: 25px 0;">
          <h4 style="margin: 0 0 12px 0; color: #1e40af; font-size: 15px;">📦 What's in your package?</h4>
          <ul style="margin: 0; padding-left: 20px; color: #1e3a8a; line-height: 2;">
            {{#each items}}
            <li>{{name}} (Qty: {{qty}})</li>
            {{/each}}
          </ul>
        </div>

        <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin: 25px 0;">
          <h4 style="margin: 0 0 10px 0; color: #78350f; font-size: 15px;">💡 Delivery Tips</h4>
          <ul style="margin: 0; padding-left: 20px; color: #92400e; line-height: 2; font-size: 14px;">
            <li>Make sure someone is available to receive the package</li>
            <li>Check the tracking number for real-time updates</li>
            <li>Contact us if delivery is delayed beyond the estimated date</li>
          </ul>
        </div>

        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 30px;">
          Questions about your shipment? Our support team is here to help!
        </p>

        <p style="color: #333; font-size: 15px; margin-top: 25px;">
          Thank you for your order!<br>
          <strong>{{siteName}} Team</strong>
        </p>
      </div>
    `,
    isProtected: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Order Delivered',
    eventType: EmailEventType.ORDER_DELIVERED,
    subject: '✅ Order Delivered - #{{orderId}}',
    body: `
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 32px;">🎊 Delivered!</h1>
        <p style="color: rgba(255,255,255,0.95); margin: 15px 0 0 0; font-size: 18px;">Your order has arrived</p>
      </div>
      
      <div style="padding: 40px 20px;">
        <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hello <strong>{{userName}}</strong>,</p>
        
        <p style="font-size: 16px; color: #555; line-height: 1.8;">
          Great news! Your order <strong>#{{orderId}}</strong> has been successfully delivered. We hope you're as excited as we are!
        </p>

        <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 25px; margin: 30px 0; border-radius: 4px; text-align: center;">
          <h3 style="margin: 0 0 10px 0; color: #065f46; font-size: 20px;">✨ How do you like your purchase?</h3>
          <p style="margin: 0 0 20px 0; color: #047857; font-size: 14px;">
            Your feedback helps us improve and helps other customers make informed decisions.
          </p>
          <a href="{{siteUrl}}/account/orders/{{orderId}}/review" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
            ⭐ Write a Review
          </a>
        </div>

        <div style="background: #fef3c7; border-radius: 8px; padding: 25px; margin: 30px 0; text-align: center;">
          <h4 style="margin: 0 0 15px 0; color: #78350f; font-size: 18px;">🎁 Share Your Joy</h4>
          <p style="margin: 0 0 15px 0; color: #92400e; font-size: 14px; line-height: 1.6;">
            Love what you received? Share your experience on social media and tag us!
          </p>
          <p style="margin: 0; color: #78350f; font-weight: 600; font-size: 15px;">
            #{{siteName}} #Handmade
          </p>
        </div>

        <div style="background: #f0f9ff; border-radius: 8px; padding: 25px; margin: 30px 0;">
          <h4 style="margin: 0 0 12px 0; color: #1e40af; font-size: 16px;">💡 Need Help?</h4>
          <ul style="margin: 0; padding-left: 20px; color: #1e3a8a; line-height: 2; font-size: 14px;">
            <li>Have questions about your product? Check the included instructions</li>
            <li>Need to return or exchange? We've got you covered</li>
            <li>Contact support anytime - we're here to help!</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 35px 0;">
          <a href="{{siteUrl}}/account/orders/{{orderId}}" style="display: inline-block; background: #6b7280; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
            📋 View Order Details
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 30px; text-align: center;">
          Thank you for choosing {{siteName}}! We can't wait to serve you again.
        </p>

        <p style="color: #333; font-size: 15px; margin-top: 30px; text-align: center;">
          With gratitude,<br>
          <strong>{{siteName}} Team</strong>
        </p>
      </div>
    `,
    isProtected: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Order Cancelled',
    eventType: EmailEventType.ORDER_CANCELLED,
    subject: '❌ Order Cancelled - #{{orderId}}',
    body: `
      <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 35px 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Order Cancelled</h1>
        <p style="color: rgba(255,255,255,0.95); margin: 12px 0 0 0; font-size: 16px;">Order #{{orderId}}</p>
      </div>
      
      <div style="padding: 35px 20px;">
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hello <strong>{{userName}}</strong>,</p>
        
        <p style="font-size: 15px; color: #555; line-height: 1.7;">
          We're writing to confirm that your order <strong>#{{orderId}}</strong> has been cancelled.
        </p>

        <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 25px; margin: 25px 0; border-radius: 4px;">
          <h3 style="margin: 0 0 15px 0; color: #991b1b; font-size: 18px;">📋 Cancellation Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; color: #7f1d1d; font-size: 14px; font-weight: 600;">Order ID:</td>
              <td style="padding: 10px 0; color: #991b1b; font-size: 14px;">#{{orderId}}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #7f1d1d; font-size: 14px; font-weight: 600;">Order Date:</td>
              <td style="padding: 10px 0; color: #991b1b; font-size: 14px;">{{orderDate}}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #7f1d1d; font-size: 14px; font-weight: 600;">Cancelled On:</td>
              <td style="padding: 10px 0; color: #991b1b; font-size: 14px;">{{cancelledDate}}</td>
            </tr>
            {{#if cancelReason}}
            <tr>
              <td style="padding: 10px 0; color: #7f1d1d; font-size: 14px; font-weight: 600;">Reason:</td>
              <td style="padding: 10px 0; color: #991b1b; font-size: 14px;">{{cancelReason}}</td>
            </tr>
            {{/if}}
          </table>
        </div>

        <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 4px;">
          <h4 style="margin: 0 0 10px 0; color: #1e40af; font-size: 16px;">💰 Refund Information</h4>
          <p style="margin: 0; color: #1e3a8a; font-size: 14px; line-height: 1.6;">
            {{#if refundAmount}}
            A refund of <strong>₹{{refundAmount}}</strong> will be processed within 5-7 business days to your original payment method.
            {{else}}
            If you made a payment, your refund will be processed within 5-7 business days.
            {{/if}}
          </p>
        </div>

        <div style="background: #fef3c7; border-radius: 8px; padding: 25px; margin: 25px 0; text-align: center;">
          <h4 style="margin: 0 0 15px 0; color: #78350f; font-size: 18px;">🛍️ Come Back Soon!</h4>
          <p style="margin: 0 0 20px 0; color: #92400e; font-size: 14px; line-height: 1.6;">
            We're sorry to see this order cancelled. Browse our collection and find something perfect for you!
          </p>
          <a href="{{siteUrl}}/products" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
            🛍️ Continue Shopping
          </a>
        </div>

        <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 25px 0;">
          <h4 style="margin: 0 0 10px 0; color: #374151; font-size: 15px;">❓ Have Questions?</h4>
          <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
            If you have any questions about this cancellation or your refund, our support team is here to help. Don't hesitate to reach out!
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="{{siteUrl}}/support" style="display: inline-block; background: #6b7280; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
            💬 Contact Support
          </a>
        </div>

        <p style="color: #333; font-size: 15px; margin-top: 30px;">
          Best regards,<br>
          <strong>{{siteName}} Team</strong>
        </p>
      </div>
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
  {
    name: 'Security Alert',
    eventType: 'SECURITY_ALERT',
    subject: 'Security Alert: Suspicious Activity Detected',
    body: `
      <h2>Security Alert</h2>
      <p>Hello {{userName}},</p>
      <p>We detected suspicious activity on your account:</p>
      <ul>
        <li><strong>Time:</strong> {{alertTime}}</li>
        <li><strong>IP Address:</strong> {{ipAddress}}</li>
        <li><strong>Location:</strong> {{location}}</li>
        <li><strong>Activity:</strong> {{activityDescription}}</li>
      </ul>
      <p>If this wasn't you, please:</p>
      <ol>
        <li>Change your password immediately</li>
        <li>Review your account security settings</li>
        <li>Contact our support team if you have concerns</li>
      </ol>
      <p>Best regards,<br>{{siteName}} Security Team</p>
    `,
    isProtected: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Promotional Email',
    eventType: 'PROMOTION',
    subject: '{{promoTitle}} - Special Offer Just for You!',
    body: `
      <h2>{{promoTitle}}</h2>
      <p>Hello {{userName}},</p>
      <p>{{promoMessage}}</p>
      {{#promoCode}}
      <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Use code:</strong> <code style="font-size: 18px; font-weight: bold;">{{promoCode}}</code></p>
        <p><strong>Discount:</strong> {{discount}}</p>
      </div>
      {{/promoCode}}
      {{#ctaLink}}
      <p><a href="{{ctaLink}}" style="display: inline-block; padding: 12px 24px; background-color: #DC2626; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">Shop Now</a></p>
      {{/ctaLink}}
      <p>Best regards,<br>{{siteName}} Team</p>
    `,
    isProtected: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Support Ticket Reply',
    eventType: EmailEventType.SUPPORT_TICKET_REPLY,
    subject: 'Re: {{ticketSubject}} - Support Ticket #{{ticketId}}',
    body: `
      <h2>New Reply to Your Support Ticket</h2>
      <p>Hello {{userName}},</p>
      <p>You have received a new reply from our support team regarding your ticket:</p>
      <div style="background-color: #f9f9f9; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0;">
        <p><strong>Ticket:</strong> {{ticketSubject}}</p>
        <p><strong>Ticket ID:</strong> #{{ticketId}}</p>
      </div>
      <div style="background-color: #ffffff; border: 1px solid #e0e0e0; padding: 15px; margin: 20px 0; border-radius: 5px;">
        <p><strong>Reply from {{adminName}}:</strong></p>
        <div style="margin-top: 10px;">
          {{{adminMessage}}}
        </div>
      </div>
      <p style="margin-top: 20px;">
        <a href="{{ticketUrl}}" style="display: inline-block; padding: 12px 24px; background-color: #DC2626; color: white; text-decoration: none; border-radius: 5px;">View Ticket</a>
      </p>
      <p>If you have any further questions, please reply directly to this ticket.</p>
      <p>Best regards,<br>{{siteName}} Support Team</p>
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
    
    console.log(`Upserting ${defaultTemplates.length} email templates...`);
    
    // Use upsert to update existing templates or insert new ones
    let updatedCount = 0;
    let insertedCount = 0;
    
    for (const template of defaultTemplates) {
      const result = await templatesCollection.updateOne(
        { eventType: template.eventType },
        { 
          $set: {
            name: template.name,
            subject: template.subject,
            body: template.body,
            isProtected: template.isProtected,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          }
        },
        { upsert: true }
      );
      
      if (result.upsertedCount > 0) {
        insertedCount++;
        console.log(`✓ Inserted new template: ${template.name}`);
      } else if (result.modifiedCount > 0) {
        updatedCount++;
        console.log(`✓ Updated template: ${template.name}`);
      }
    }
    
    console.log(`\n✅ Summary: ${insertedCount} inserted, ${updatedCount} updated, ${defaultTemplates.length - insertedCount - updatedCount} unchanged`);
    
    await mongo.close();
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

