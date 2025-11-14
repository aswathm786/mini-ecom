# Payment Gateway Setup (Razorpay)

This guide explains how to set up Razorpay payment gateway for your Handmade Harmony store.

---

## What is Razorpay?

Razorpay is a payment gateway that lets your customers pay online using:
- Credit cards
- Debit cards
- UPI
- Net banking
- Wallets (Paytm, PhonePe, etc.)

---

## Step 1: Create Razorpay Account

### Sign Up

1. **Go to:** https://razorpay.com
2. **Click "Sign Up"**
3. **Enter your details:**
   - Business name
   - Email
   - Phone number
   - Password
4. **Verify your email**
5. **Complete business details** (for live account)

### Account Types

- **Test Account:** For development (free)
- **Live Account:** For production (requires business verification)

**Start with test account** to test everything first!

---

## Step 2: Get API Keys

### For Test Mode

1. **Log in to Razorpay Dashboard:** https://dashboard.razorpay.com
2. **Go to:** Settings > API Keys
3. **You'll see:**
   - **Key ID:** Starts with `rzp_test_...`
   - **Key Secret:** Click "Reveal" to see it

### For Live Mode

1. **Complete business verification:**
   - Business details
   - Bank account
   - Documents (GST, PAN, etc.)
2. **Once verified, go to:** Settings > API Keys
3. **Switch to "Live Mode"**
4. **Get live keys** (starts with `rzp_live_...`)

**⚠️ Important:** Never share your Key Secret with anyone!

---

## Step 3: Configure in .env File

### Add to .env

```bash
# Razorpay Test Keys (for development)
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET
```

### Or Configure in Admin Panel

1. **Log in to admin:** http://localhost/admin
2. **Go to:** Settings > Payment
3. **Enter:**
   - **Key ID:** Your Razorpay Key ID
   - **Key Secret:** Your Razorpay Key Secret
   - **Webhook Secret:** Your webhook secret (see Step 4)
4. **Toggle "Enable Razorpay"** to ON
5. **Toggle "Test Mode"** to ON (for testing)
6. **Click "Save Settings"**

---

## Step 4: Set Up Webhooks

### What are Webhooks?

Webhooks notify your server when payments are processed. This updates order status automatically.

### Configure Webhook in Razorpay

1. **Go to:** Razorpay Dashboard > Settings > Webhooks
2. **Click "Add New Webhook"**
3. **Enter Webhook URL:**
   - **Local testing:** Use ngrok (see below)
   - **Production:** `https://yourdomain.com/api/webhook/razorpay`
4. **Select events:**
   - ✅ `payment.captured`
   - ✅ `payment.failed`
   - ✅ `order.paid`
   - ✅ `refund.created`
5. **Click "Create Webhook"**
6. **Copy the webhook secret** (starts with `whsec_...`)
7. **Add to .env:**
   ```bash
   RAZORPAY_WEBHOOK_SECRET=whsec_YOUR_SECRET
   ```

### Testing Webhooks Locally (ngrok)

**For local development:**

1. **Install ngrok:**
   ```bash
   # Download from https://ngrok.com/download
   # Or using Homebrew (Mac):
   brew install ngrok
   ```

2. **Start your backend:**
   ```bash
   docker compose up -d
   ```

3. **Start ngrok:**
   ```bash
   ngrok http 3000
   ```

4. **Copy the HTTPS URL** (looks like: `https://abc123.ngrok.io`)

5. **Use in Razorpay webhook URL:**
   ```
   https://abc123.ngrok.io/api/webhook/razorpay
   ```

6. **Test webhook:**
   - Make a test payment
   - Check ngrok dashboard for webhook requests
   - Check your backend logs

---

## Step 5: Test Payments

### Test Card Numbers

Razorpay provides test cards:

**Successful Payment:**
- **Card:** 4111 1111 1111 1111
- **Expiry:** Any future date (e.g., 12/25)
- **CVV:** Any 3 digits (e.g., 123)
- **Name:** Any name

**Failed Payment:**
- **Card:** 4000 0000 0000 0002
- **Expiry:** Any future date
- **CVV:** Any 3 digits

### Test Payment Flow

1. **Add product to cart**
2. **Go to checkout**
3. **Select "Razorpay" as payment method**
4. **Click "Pay Now"**
5. **Enter test card details**
6. **Complete payment**
7. **Verify:**
   - Order status updated
   - Confirmation email sent
   - Invoice generated

---

## Step 6: Enable Cash on Delivery (COD)

### Configure COD

1. **Go to:** Admin > Settings > Payment
2. **Toggle "Enable COD"** to ON
3. **Set limits:**
   - **Minimum order:** ₹100 (or your preference)
   - **Maximum order:** ₹5000 (or your preference)
4. **Click "Save Settings"**

### How COD Works

- Customer selects "Cash on Delivery" at checkout
- Order is created with status "Pending"
- You ship the product
- Customer pays when receiving
- Update order status to "Delivered" after payment received

---

## Step 7: Switch to Live Mode

### When Ready for Production

1. **Complete Razorpay business verification**
2. **Get live API keys:**
   - Log in to Razorpay Dashboard
   - Switch to "Live Mode"
   - Go to Settings > API Keys
   - Copy live Key ID and Key Secret
3. **Update .env:**
   ```bash
   RAZORPAY_KEY_ID=rzp_live_YOUR_KEY_ID
   RAZORPAY_KEY_SECRET=YOUR_LIVE_SECRET
   ```
4. **Update webhook URL** to your production domain
5. **Disable test mode** in admin panel
6. **Test with small real payment** first!

---

## Troubleshooting

### Payment Button Not Working

**Check:**
1. Razorpay keys are correct in `.env`
2. Frontend has Razorpay script loaded
3. Browser console for errors

**Solution:**
```bash
# Check backend logs
docker compose logs api | grep -i razorpay

# Check frontend console
# Open browser DevTools > Console
```

### Payment Succeeds but Order Not Updated

**Check webhook:**
1. Verify webhook URL is correct
2. Check webhook secret matches
3. Check webhook logs in Razorpay dashboard

**Solution:**
```bash
# Check webhook logs
docker compose logs api | grep -i webhook

# Test webhook manually
curl -X POST http://localhost:3000/api/webhook/razorpay \
  -H "X-Razorpay-Signature: test" \
  -H "Content-Type: application/json" \
  -d '{"event":"payment.captured"}'
```

### "Invalid Key" Error

**Solution:**
1. Check Key ID and Key Secret are correct
2. Make sure you're using test keys in test mode
3. Make sure you're using live keys in live mode
4. Keys are case-sensitive

### Webhook Signature Verification Failed

**Solution:**
1. Check `RAZORPAY_WEBHOOK_SECRET` matches Razorpay dashboard
2. Verify webhook URL is correct
3. Check webhook events are selected correctly

---

## Security Best Practices

### ✅ Do:

- **Use test keys** for development
- **Rotate keys** if compromised
- **Keep Key Secret secure** (never commit to Git)
- **Use HTTPS** for webhooks in production
- **Verify webhook signatures** (already implemented)

### ❌ Don't:

- **Share your Key Secret** with anyone
- **Commit keys to Git** (use `.env` which is in `.gitignore`)
- **Use live keys** in development
- **Disable webhook signature verification**

---

## Payment Flow

### How It Works

1. **Customer clicks "Pay Now"**
2. **Frontend opens Razorpay checkout**
3. **Customer enters payment details**
4. **Razorpay processes payment**
5. **Razorpay sends webhook to your server**
6. **Your server:**
   - Verifies webhook signature
   - Updates order status
   - Sends confirmation email
   - Generates invoice

### Refund Flow

1. **Admin issues refund** in admin panel
2. **Backend calls Razorpay API** to process refund
3. **Razorpay processes refund**
4. **Webhook notifies your server**
5. **Order status updated** to "Refunded"

---

## API Reference

### Razorpay Documentation

- **Dashboard:** https://dashboard.razorpay.com
- **API Docs:** https://razorpay.com/docs/api/
- **Webhooks:** https://razorpay.com/docs/webhooks/
- **Test Cards:** https://razorpay.com/docs/payments/test-cards/

---

## Support

### Razorpay Support

- **Email:** support@razorpay.com
- **Phone:** 1800-123-1234
- **Chat:** Available in dashboard

### Handmade Harmony Support

- Check logs: `docker compose logs api`
- See troubleshooting: [docs/troubleshooting.md](troubleshooting.md)

---

**Your payment gateway is now set up! 💳**

Test everything thoroughly before going live!

