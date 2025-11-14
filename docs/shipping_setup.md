# Shipping Setup (Delhivery)

This guide explains how to set up Delhivery shipping integration for your Handmade Harmony store.

---

## What is Delhivery?

Delhivery is a logistics and shipping service in India that handles:
- **Pickup:** From your warehouse
- **Shipping:** To customer addresses
- **Tracking:** Real-time tracking updates
- **Labels:** Shipping label generation

---

## Step 1: Create Delhivery Account

### Sign Up

1. **Go to:** https://delhivery.com
2. **Click "Partner with Us"** or "Become a Partner"
3. **Fill in business details:**
   - Business name
   - GST number (if applicable)
   - Contact information
   - Warehouse address
4. **Submit for approval**
5. **Wait for account activation** (usually 1-2 business days)

### Account Types

- **Development Account:** For testing (limited features)
- **Production Account:** Full access (requires verification)

**Start with development account** to test integration!

---

## Step 2: Get API Credentials

### For Development/Testing

1. **Log in to Delhivery Dashboard**
2. **Go to:** Developer Portal or API Settings
3. **Create API Token:**
   - Click "Generate Token"
   - Copy the token (starts with `your_token_here`)
   - **⚠️ Save it immediately** - you can't see it again!
4. **Get Client ID:**
   - Usually your business ID or username
   - Found in dashboard or provided by Delhivery

### For Production

1. **Complete business verification**
2. **Get production credentials** from Delhivery support
3. **Configure warehouse details**
4. **Set up pickup schedules**

---

## Step 3: Configure in .env File

### Add to .env

```bash
# Delhivery API Credentials
DELHIVERY_TOKEN=your_delhivery_token_here
DELHIVERY_CLIENT_ID=your_client_id_here
```

### Or Configure in Admin Panel

1. **Log in to admin:** http://localhost/admin
2. **Go to:** Settings > Shipping
3. **Enter:**
   - **Token:** Your Delhivery API token
   - **Client ID:** Your Delhivery client ID
4. **Toggle "Enable Delhivery"** to ON
5. **Toggle "Test Mode"** to ON (for testing)
6. **Click "Save Settings"**

---

## Step 4: Test Connection

### Test in Admin Panel

1. **Go to:** Admin > Settings > Shipping
2. **Click "Test Connection"** button
3. **You should see:** "Connection successful" or error message

### Test via API

```bash
# Test API connection
curl -X GET "https://staging-express.delhivery.com/api/v1/pincodes" \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Accept: application/json"
```

**Expected response:**
```json
{
  "status": "success",
  "data": [...]
}
```

---

## Step 5: Configure Shipping Rates

### Set Up Shipping Zones

1. **Go to:** Admin > Settings > Shipping
2. **Click "Shipping Zones"**
3. **Add zones:**
   - **Local:** Same city (₹50)
   - **State:** Same state (₹100)
   - **National:** Rest of India (₹150)
   - **International:** (if applicable)

### Set Up Shipping Rules

1. **Go to:** Admin > Settings > Shipping > Rules
2. **Configure:**
   - **Free shipping:** Above ₹1000
   - **Flat rate:** ₹50 for all orders
   - **Weight-based:** ₹10 per kg
   - **Distance-based:** Based on pincode

---

## Step 6: Create Shipment

### When Order is Placed

**Automatic (Recommended):**
1. Order is placed
2. System automatically creates Delhivery shipment
3. Shipping label generated
4. Tracking number assigned
5. Customer notified

**Manual:**
1. **Go to:** Admin > Orders
2. **Open order**
3. **Click "Create Shipment"**
4. **Enter details:**
   - Pickup location
   - Package weight
   - Package dimensions
5. **Click "Create"**
6. **Shipping label** will be generated and downloaded

---

## Step 7: Track Shipment

### Automatic Tracking

**Delhivery webhooks update order status automatically:**

1. **Configure webhook in Delhivery dashboard**
2. **Webhook URL:** `https://yourdomain.com/api/webhook/delhivery`
3. **Events:**
   - Shipment picked up
   - In transit
   - Out for delivery
   - Delivered
   - Failed delivery

### Manual Tracking

1. **Go to:** Admin > Orders
2. **Open order**
3. **Find "Tracking" section**
4. **Enter AWB (tracking number)**
5. **Click "Track"**
6. **Real-time status** displayed

### Customer Tracking

**Customers can track:**
1. **Go to:** Order details page
2. **Click "Track Order"**
3. **Enter AWB** or order number
4. **See real-time status**

---

## Step 8: Handle Webhooks

### Configure Webhook in Delhivery

1. **Go to:** Delhivery Dashboard > Settings > Webhooks
2. **Add webhook URL:**
   ```
   https://yourdomain.com/api/webhook/delhivery
   ```
3. **Select events:**
   - ✅ Shipment picked up
   - ✅ In transit
   - ✅ Out for delivery
   - ✅ Delivered
   - ✅ Failed delivery
4. **Save webhook**

### Webhook Processing

**Your server automatically:**
- Receives webhook from Delhivery
- Verifies webhook signature
- Updates order status
- Sends email to customer
- Updates tracking information

---

## Step 9: Generate Shipping Labels

### Automatic Label Generation

**When shipment is created:**
1. Label is automatically generated
2. Saved to `storage/uploads/labels/`
3. PDF format
4. Available for download in admin panel

### Manual Label Generation

1. **Go to:** Admin > Orders > [Order]
2. **Click "Generate Label"**
3. **Label downloads** as PDF
4. **Print and attach** to package

### Label Contains

- **AWB number** (tracking)
- **Pickup address**
- **Delivery address**
- **Barcode** for scanning
- **Package details**

---

## Troubleshooting

### "Invalid Token" Error

**Check:**
1. Token is correct in `.env`
2. Token hasn't expired (regenerate if needed)
3. Using correct token for test/production mode

**Solution:**
```bash
# Check token in .env
cat .env | grep DELHIVERY_TOKEN

# Regenerate token in Delhivery dashboard
```

### "Connection Failed" Error

**Check:**
1. Internet connection
2. Delhivery API is accessible
3. Firewall allows outbound connections

**Solution:**
```bash
# Test API connectivity
curl -I https://staging-express.delhivery.com

# Check backend logs
docker compose logs api | grep -i delhivery
```

### "Shipment Creation Failed"

**Check:**
1. All required fields provided (address, weight, dimensions)
2. Pickup pincode is serviceable
3. Delivery pincode is serviceable

**Solution:**
```bash
# Check serviceable pincodes
curl "https://staging-express.delhivery.com/api/v1/pincodes" \
  -H "Authorization: Token YOUR_TOKEN"

# Check order details
docker compose logs api | grep -i shipment
```

### Webhook Not Received

**Check:**
1. Webhook URL is correct and publicly accessible
2. Webhook is enabled in Delhivery dashboard
3. Server is running and accessible

**Solution:**
```bash
# Check webhook logs
docker compose logs api | grep -i webhook

# Test webhook manually
curl -X POST http://localhost:3000/api/webhook/delhivery \
  -H "Content-Type: application/json" \
  -d '{"awb":"1234567890","status":"In Transit"}'
```

---

## Testing Shipping

### Test Mode

**For development:**
1. **Enable test mode** in admin panel
2. **Use test credentials** from Delhivery
3. **Test shipment creation** (won't actually ship)
4. **Test tracking** (mock data)

### Production Testing

**Before going live:**
1. **Create test shipment** with real credentials
2. **Verify label generation**
3. **Test tracking updates**
4. **Send test package** to yourself
5. **Verify delivery**

---

## Shipping Rates

### How Rates are Calculated

**Delhivery calculates rates based on:**
- **Weight:** Package weight in kg
- **Dimensions:** Length × Width × Height
- **Distance:** From pickup to delivery pincode
- **Service type:** Express, Standard, Economy

### Setting Custom Rates

1. **Go to:** Admin > Settings > Shipping > Rates
2. **Add custom rates:**
   - By weight
   - By distance
   - By pincode
   - Flat rate
3. **Override Delhivery rates** if needed

---

## Best Practices

### ✅ Do:

- **Test thoroughly** before going live
- **Keep credentials secure** (never commit to Git)
- **Monitor webhook delivery** (check logs regularly)
- **Update tracking** when status changes
- **Handle failed deliveries** promptly

### ❌ Don't:

- **Share API credentials** with anyone
- **Use production credentials** in development
- **Ignore webhook failures** (set up alerts)
- **Forget to update order status** after delivery

---

## API Reference

### Delhivery Documentation

- **Developer Portal:** https://delhivery.com/developer
- **API Docs:** https://delhivery.com/api-docs
- **Support:** support@delhivery.com

### Handmade Harmony Integration

**Service:** `backend/src/services/DelhiveryService.ts`

**Methods:**
- `createShipment()` - Create new shipment
- `track()` - Track shipment by AWB
- `getRates()` - Get shipping rates
- `cancelShipment()` - Cancel shipment

---

## Support

### Delhivery Support

- **Email:** support@delhivery.com
- **Phone:** 1800-XXX-XXXX
- **Chat:** Available in dashboard

### Handmade Harmony Support

- Check logs: `docker compose logs api`
- See troubleshooting: [docs/troubleshooting.md](troubleshooting.md)

---

**Your shipping integration is now set up! 📦**

Test everything thoroughly and start shipping!

