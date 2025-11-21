# Payment Processing Documentation

Complete guide to setting up and managing payments with Razorpay.

## 📋 Contents

- [Razorpay Setup](razorpay-setup.md) - Complete Razorpay integration guide
- [Testing](testing.md) - Test payments before going live

## 💳 Supported Payment Methods

### Online Payments (Razorpay)
- Credit/Debit Cards
- UPI
- Net Banking
- Wallets (Paytm, PhonePe, etc.)
- EMI options

### Cash on Delivery (COD)
- Optional COD support
- Configurable COD limit
- Zone-based availability

## 🚀 Quick Setup

### Step 1: Create Razorpay Account

1. Visit [razorpay.com](https://razorpay.com)
2. Sign up for an account
3. Complete KYC verification
4. Access dashboard

### Step 2: Get API Keys

1. Login to Razorpay Dashboard
2. Go to Settings → API Keys
3. Generate Test Keys (for development)
4. Note down:
   - Key ID (starts with `rzp_test_`)
   - Key Secret

### Step 3: Configure in Application

Edit `.env` file:
```bash
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxx
ENABLE_RAZORPAY=true
ENABLE_COD=true
COD_LIMIT=10000
```

Restart application:
```bash
# Docker
docker compose restart

# PM2
pm2 restart all
```

### Step 4: Test Payment

1. Go to your store
2. Add item to cart
3. Proceed to checkout
4. Select Razorpay payment
5. Use test card: `4111 1111 1111 1111`
6. Complete payment

## 🧪 Test Mode vs Live Mode

### Test Mode (Development)
- Use test API keys (`rzp_test_`)
- Use test cards (no real charges)
- Test webhook integration
- Verify payment flow

### Live Mode (Production)
- Use live API keys (`rzp_live_`)
- Real payments processed
- Actual money transferred
- Enable only after thorough testing

## 🔔 Webhook Setup

Webhooks notify your server about payment events.

### Step 1: Configure Webhook URL

In Razorpay Dashboard:
1. Go to Settings → Webhooks
2. Add webhook URL: `https://yourstore.com/api/webhook/razorpay`
3. Select events:
   - `payment.captured`
   - `payment.failed`
   - `refund.created`
4. Generate webhook secret
5. Save

### Step 2: Update Configuration

```bash
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

### Step 3: Test Webhook

Use Razorpay's webhook testing tool in dashboard.

## 💰 Payment Flow

1. **Customer initiates checkout**
2. **Frontend creates Razorpay order**
3. **Razorpay payment modal opens**
4. **Customer completes payment**
5. **Razorpay sends webhook notification**
6. **Backend verifies and updates order**
7. **Customer receives confirmation**

## 🔒 Security

### Payment Signature Verification

The backend automatically verifies all payments using:
- Order ID
- Payment ID
- Razorpay signature

Never trust client-side payment status without server verification.

### PCI Compliance

Razorpay handles all sensitive card data. Your server never stores:
- Card numbers
- CVV
- Expiry dates

## 📊 Managing Payments

### View Transactions

Admin Panel → Payments:
- All transactions
- Payment status
- Amount details
- Customer information

### Process Refunds

1. Go to Orders
2. Select order
3. Click "Refund"
4. Enter refund amount
5. Add reason
6. Confirm

Refund will be processed through Razorpay and credited to customer's original payment method within 5-7 business days.

## ⚠️ Common Issues

### Payment Fails

**Causes:**
- Insufficient funds
- Card blocked
- Network timeout
- Bank issues

**Solution:**
- Customer should retry with different card/method
- Check Razorpay dashboard for details

### Webhook Not Received

**Causes:**
- Incorrect webhook URL
- Firewall blocking
- SSL certificate issues

**Solution:**
- Verify webhook URL is accessible
- Check server logs
- Test webhook in Razorpay dashboard

### Invalid Signature Error

**Causes:**
- Wrong webhook secret
- Payload tampering

**Solution:**
- Verify `RAZORPAY_WEBHOOK_SECRET` is correct
- Check for special characters in secret

## 📚 Additional Resources

- [Razorpay Setup Guide](razorpay-setup.md)
- [Testing Guide](testing.md)
- [Razorpay Documentation](https://razorpay.com/docs/)
- [Test Cards](https://razorpay.com/docs/payments/payments/test-card-details/)

