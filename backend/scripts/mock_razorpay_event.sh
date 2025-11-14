#!/bin/bash
# Mock Razorpay Webhook Event
# Sends a sample Razorpay webhook event with signature verification

API_URL="${API_URL:-http://localhost:5000}"
WEBHOOK_SECRET="${RAZORPAY_WEBHOOK_SECRET:-test_webhook_secret}"

# Sample webhook payload
PAYLOAD='{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_test123456",
        "entity": "payment",
        "amount": 10000,
        "currency": "INR",
        "status": "captured",
        "order_id": "order_test123456",
        "method": "card",
        "created_at": 1234567890
      }
    }
  }
}'

# Generate signature
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | sed 's/^.* //')

echo "Sending Razorpay webhook event..."
echo "Payload: $PAYLOAD"
echo "Signature: $SIGNATURE"
echo ""

curl -X POST "$API_URL/api/webhook/razorpay" \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: $SIGNATURE" \
  -d "$PAYLOAD" \
  -v

echo ""
echo "Done."

