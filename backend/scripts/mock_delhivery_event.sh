#!/bin/bash
# Mock Delhivery Webhook Event
# Sends a sample Delhivery webhook event

API_URL="${API_URL:-http://localhost:5000}"

# Sample webhook payload
PAYLOAD='{
  "event": "shipment.status_update",
  "awb": "1234567890123",
  "status": "In Transit",
  "location": "Mumbai",
  "timestamp": "2024-01-15T10:30:00Z",
  "remarks": "Package in transit to destination"
}'

echo "Sending Delhivery webhook event..."
echo "Payload: $PAYLOAD"
echo ""

curl -X POST "$API_URL/api/webhook/delhivery" \
  -H "Content-Type: application/json" \
  -H "X-Delhivery-Signature: test_signature" \
  -d "$PAYLOAD" \
  -v

echo ""
echo "Done."

