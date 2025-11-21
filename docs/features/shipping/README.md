# Shipping Integration Documentation

Complete guide to Delhivery shipping integration for automated shipping and tracking.

## 📋 Contents

- [Delhivery Setup](delhivery-setup.md) - Complete integration guide

## 📦 Features

- Automatic shipping rate calculation
- Order tracking
- AWB (Airway Bill) generation
- Status updates via webhooks
- Multiple packaging options
- COD remittance tracking

## 🚀 Quick Setup

### Step 1: Create Delhivery Account

1. Visit [delhivery.com](https://www.delhivery.com)
2. Sign up for merchant account
3. Complete KYC verification
4. Get approved

### Step 2: Get API Credentials

1. Login to Delhivery Panel
2. Go to API section
3. Generate API token
4. Note your Client ID

### Step 3: Configure Application

Edit `.env`:
```bash
DELHIVERY_TOKEN=your_api_token_here
DELHIVERY_CLIENT_ID=your_client_id
DELHIVERY_API_URL=https://track.delhivery.com/api
ENABLE_DELHIVERY=true

# Fallback settings
DEFAULT_SHIPPING_COST=50
FREE_SHIPPING_THRESHOLD=500
```

Restart application.

### Step 4: Configure in Admin Panel

1. Go to Settings → Shipping
2. Enter Delhivery credentials
3. Test connection
4. Configure shipping zones
5. Set rates and rules
6. Save

## 🎯 Shipping Flow

1. **Customer places order**
2. **Shipping address validated**
3. **Shipping cost calculated** (via Delhivery API)
4. **Order confirmed**
5. **AWB generated** (when order is ready to ship)
6. **Pickup scheduled**
7. **Package picked up**
8. **Customer receives tracking updates**
9. **Delivery completed**

## 📊 Shipping Management

### Create Shipment

1. Go to Orders
2. Select order
3. Click "Create Shipment"
4. Verify details:
   - Weight
   - Dimensions
   - Package type
5. Generate AWB
6. Print shipping label
7. Schedule pickup

### Track Shipment

**For Customers:**
- Tracking link in order confirmation email
- Track from "My Orders" page
- Real-time status updates

**For Admin:**
- View in Orders → Order Details
- See detailed tracking timeline
- Delhivery tracking number
- Delivery status updates

## ⚙️ Configuration Options

### Shipping Zones

Define shipping availability by:
- PIN codes
- States
- Cities
- Delivery time estimates

### Shipping Rates

**Calculation Methods:**
- Weight-based
- Order value-based
- Flat rate
- Free shipping threshold
- Zone-based rates

### Package Settings

- Default weight
- Default dimensions
- Package types (envelope, box, etc.)
- Fragile item handling

## 🔔 Webhook Integration

Delhivery sends updates for:
- Pickup scheduled
- In transit
- Out for delivery
- Delivered
- RTO (Return to Origin)
- Failed delivery

Configure webhook URL: `https://yourstore.com/api/webhook/delhivery`

## 💰 COD (Cash on Delivery)

### Enable COD

```bash
ENABLE_COD=true
COD_LIMIT=10000  # Maximum COD amount
```

### COD Remittance

- Track COD collections in Delhivery panel
- Automated remittance reports
- Reconcile with orders

## 🆘 Common Issues

### "Serviceability Not Available"

**Cause:** Delhivery doesn't deliver to that PIN code

**Solution:**
- Check PIN code in Delhivery panel
- Offer alternative courier
- Request customer to use different address

### API Rate Limit Exceeded

**Cause:** Too many API calls

**Solution:**
- Implement caching for rate calculations
- Batch API requests
- Contact Delhivery for higher limits

### Pickup Not Scheduled

**Cause:** API error or invalid parameters

**Solution:**
- Check API logs
- Verify all required fields
- Ensure pickup address is correct
- Contact Delhivery support

## 📚 Additional Resources

- [Complete Delhivery Setup](delhivery-setup.md)
- [Delhivery API Documentation](https://developers.delhivery.com/)
- [Shipping Best Practices](../../deployment/production-checklist.md)

