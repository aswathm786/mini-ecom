# Part B.2 - Payments, Webhooks, Refunds, Invoices & Shipping

This document describes the payment processing, webhook handling, refund management, invoice generation, email sending, and shipping integration implemented in Part B.2.

## Overview

Part B.2 implements:
- **Razorpay Integration**: Order creation, payment capture, refunds, webhook processing
- **Webhook Processing**: Signature verification, event storage, job queueing
- **Refund Management**: Admin-initiated refunds with safety checks and idempotency
- **Invoice Generation**: HTML + PDF invoices (Node-based, with PHP Dompdf placeholder)
- **Email Service**: Sendmail and SMTP support with admin-configurable settings
- **Delhivery Shipping**: Rate calculation, shipment creation, AWB generation, tracking

## API Endpoints

### Webhooks (Public - No Auth)

- `POST /api/webhook/razorpay` - Razorpay webhook handler
  - Verifies `X-Razorpay-Signature` header
  - Stores event in `webhook_events` collection
  - Enqueues job for processing
- `POST /api/webhook/delhivery` - Delhivery webhook handler
  - Stores event and enqueues job

### Admin - Refunds

- `POST /api/admin/orders/:id/refund` - Create refund
  - Body: `{ amount?: number, reason: string }`
  - Validates refund window (REFUND_WINDOW_DAYS)
  - Checks for duplicate refunds (idempotency)
  - If `auto_capture_refunds` enabled, enqueues job to process via Razorpay
  - Requires: Authentication, Admin role, CSRF token

### Admin - Invoices

- `POST /api/admin/orders/:id/generate-invoice` - Generate invoice
  - Body: `{ sendEmail?: boolean, regenerate?: boolean }`
  - Generates HTML invoice and PDF (if puppeteer installed)
  - Optionally sends email with PDF attachment
  - Requires: Authentication, Admin role, CSRF token
- `GET /api/admin/invoices/:id` - Get invoice details
- `GET /api/admin/invoices/:id/download` - Download invoice PDF

### Admin - Shipping (Delhivery)

- `POST /api/admin/orders/:id/create-shipment` - Create Delhivery shipment
  - Creates shipment and generates AWB
  - Requires: Authentication, Admin role, CSRF token
- `GET /api/admin/shipments/:awb/label` - Download AWB label PDF
- `GET /api/shipments/:awb/track` - Public tracking endpoint (no auth)

## Configuration

### Environment Variables

Add to `.env`:

```bash
# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxx
RAZORPAY_ENABLED=true

# Delhivery
DELHIVERY_TOKEN=xxxxx
DELHIVERY_API_URL=https://track.delhivery.com/api
DELHIVERY_ENABLED=true

# Email (SMTP)
SMTP_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=noreply@handmadeharmony.com
SMTP_FROM_NAME=Handmade Harmony

# Or use sendmail (default)
MAIL_DRIVER=sendmail
EMAIL_FALLBACK_SENDMAIL=true

# Invoice
INVOICE_PREFIX=INV
STORAGE_PATH=./storage

# Refunds
REFUND_WINDOW_DAYS=7
auto_capture_refunds=true  # Set in settings collection
```

### Settings Collection Overrides

Settings can be overridden in MongoDB `settings` collection:

```javascript
db.settings.insertOne({
  key: 'auto_capture_refunds',
  value: true,
  type: 'boolean',
  description: 'Automatically process refunds via Razorpay API'
});
```

## Razorpay Setup

1. **Get API Keys**:
   - Sign up at https://razorpay.com
   - Go to Settings → API Keys
   - Copy Key ID and Key Secret (use test keys for development)

2. **Configure Webhook**:
   - Go to Settings → Webhooks
   - Add webhook URL: `https://yourdomain.com/api/webhook/razorpay`
   - Select events: `payment.captured`, `payment.failed`, `order.paid`
   - Copy webhook secret to `RAZORPAY_WEBHOOK_SECRET`

3. **Test Mode**:
   - Use test keys for development
   - Test cards: https://razorpay.com/docs/payments/test-cards/

## Delhivery Setup

1. **Get API Token**:
   - Sign up at https://www.delhivery.com
   - Contact support for API access
   - Get API token

2. **Configure**:
   - Set `DELHIVERY_TOKEN` in `.env`
   - API URL is pre-configured

## Invoice Generation

### Node PDF (Recommended)

Install puppeteer for PDF generation:

```bash
npm install puppeteer
```

Then update `InvoiceService.ts` to uncomment puppeteer code.

### PHP Dompdf (Optional)

If you prefer PHP-based PDF generation:

1. Install Dompdf in `app/Lib/dompdf/`
2. Create `tools/dompdf_generate.php`:

```php
<?php
require_once __DIR__ . '/../app/Lib/dompdf/autoload.inc.php';

use Dompdf\Dompdf;

$orderId = $argv[2] ?? null;
if (!$orderId) {
    die("Usage: php dompdf_generate.php --order=ORDER_ID\n");
}

// Fetch order from MongoDB (via Node API or direct connection)
// Generate HTML
// Generate PDF using Dompdf
// Save to storage/invoices/
```

## Email Configuration

### SMTP (Recommended for Production)

1. **Gmail**:
   - Enable 2FA
   - Generate App Password
   - Use App Password as `SMTP_PASS`

2. **Other Providers**:
   - Update `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` accordingly

### Sendmail (Development)

Default fallback. Requires `sendmail` command available on system.

## Jobs Worker

Process queued jobs (webhooks, emails, refunds, shipments):

```bash
# Development
ts-node src/cli/jobs_worker.ts

# Production
node dist/cli/jobs_worker.js
```

### Cron Setup

Add to crontab for automatic processing:

```bash
# Process jobs every minute
* * * * * cd /path/to/backend && node dist/cli/jobs_worker.js
```

Or use PM2:

```bash
pm2 start dist/cli/jobs_worker.js --name jobs-worker
```

## Tracking Sync

Sync Delhivery tracking updates:

```bash
# Sync all pending shipments
ts-node src/cli/tracking_sync.ts

# Sync specific AWB
ts-node src/cli/tracking_sync.ts 1234567890123
```

### Cron Setup

```bash
# Sync tracking every hour
0 * * * * cd /path/to/backend && node dist/cli/tracking_sync.js
```

## Testing

### Webhook Testing

1. **Razorpay Webhook**:
   ```bash
   cd backend/scripts
   ./mock_razorpay_event.sh
   ```

2. **Delhivery Webhook**:
   ```bash
   cd backend/scripts
   ./mock_delhivery_event.sh
   ```

### Signature Verification Test

```bash
npm test -- razorpay_signature.test.ts
```

### Manual Testing

1. **Create Order** (via checkout)
2. **Generate Invoice**:
   ```bash
   curl -X POST http://localhost:5000/api/admin/orders/ORDER_ID/generate-invoice \
     -H "Authorization: Bearer TOKEN" \
     -H "X-CSRF-Token: TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"sendEmail": true}'
   ```

3. **Create Refund**:
   ```bash
   curl -X POST http://localhost:5000/api/admin/orders/ORDER_ID/refund \
     -H "Authorization: Bearer TOKEN" \
     -H "X-CSRF-Token: TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"amount": 100, "reason": "Customer request"}'
   ```

4. **Create Shipment**:
   ```bash
   curl -X POST http://localhost:5000/api/admin/orders/ORDER_ID/create-shipment \
     -H "Authorization: Bearer TOKEN" \
     -H "X-CSRF-Token: TOKEN"
   ```

## Database Collections

### webhook_events
```typescript
{
  _id: ObjectId,
  source: 'razorpay' | 'delhivery',
  eventType: string,
  payload: any,
  signature?: string,
  signatureValid?: boolean,
  idempotencyKey?: string,
  processed: boolean,
  createdAt: Date
}
```

### jobs
```typescript
{
  _id: ObjectId,
  type: 'webhook.process' | 'email.send' | 'refund.process' | 'shipment.create' | 'tracking.sync',
  payload: Record<string, any>,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  attempts: number,
  maxAttempts: number,
  error?: string,
  createdAt: Date,
  updatedAt: Date,
  processedAt?: Date
}
```

### refunds
```typescript
{
  _id: ObjectId,
  paymentId: string,
  orderId: string,
  amount: number,
  currency: string,
  initiatedBy: string,
  status: 'requested' | 'processing' | 'succeeded' | 'failed',
  reason: string,
  gatewayRefundId?: string,
  gatewayResponse?: Record<string, any>,
  createdAt: Date,
  updatedAt: Date
}
```

### invoices
```typescript
{
  _id: ObjectId,
  orderId: string,
  invoiceNumber: string,
  amount: number,
  currency: string,
  pdfPath?: string,
  pdfUrl?: string,
  source: 'razorpay' | 'manual',
  generatedBy?: string,
  createdAt: Date
}
```

### shipments
```typescript
{
  _id: ObjectId,
  orderId: string,
  awb?: string,
  service?: string,
  charge?: number,
  labelFilename?: string,
  pickupScheduled?: Date,
  status: 'pending' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed',
  events: Array<{
    status: string,
    timestamp: Date,
    location?: string,
    remarks?: string
  }>,
  createdAt: Date,
  updatedAt: Date
}
```

## Security Notes

1. **Webhook Signatures**: Always verify Razorpay webhook signatures. Invalid signatures are logged but processing continues (configurable).

2. **Idempotency**: Refund operations use idempotency keys to prevent duplicate processing.

3. **Refund Window**: Server enforces `REFUND_WINDOW_DAYS` - refunds cannot be created after the window expires.

4. **Admin Access**: All admin endpoints require authentication, admin role, and CSRF protection.

## Troubleshooting

### Webhook Not Processing

1. Check `webhook_events` collection for stored events
2. Check `jobs` collection for queued jobs
3. Ensure jobs worker is running
4. Check signature verification logs

### Email Not Sending

1. Verify SMTP credentials (if using SMTP)
2. Check sendmail availability (if using sendmail)
3. Check email job status in `jobs` collection
4. Review error logs

### Invoice PDF Not Generating

1. Install puppeteer: `npm install puppeteer`
2. Check `storage/invoices/` directory permissions
3. Verify order data is complete

### Refund Failing

1. Check Razorpay API credentials
2. Verify payment status is 'completed'
3. Check refund window hasn't expired
4. Review refund job status in `jobs` collection

## Git Commit

```bash
git add .
git commit -m "B.2: Payments (Razorpay), webhooks, refunds, invoices & Delhivery integration (scaffold)"
git push origin feature/payments-webhooks
```

