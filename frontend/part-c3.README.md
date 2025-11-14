# Part C.3 - Checkout, Payments UI & Order Confirmation

This document describes the checkout flow, payment integration (Razorpay + COD), and order confirmation pages implemented in Part C.3.

## Overview

Part C.3 implements:
- **Checkout Page**: Complete checkout flow with address selection, shipping options, payment methods
- **Razorpay Integration**: Client-side Razorpay Checkout SDK integration
- **COD Support**: Cash on Delivery payment option
- **Order Confirmation**: Order details, payment status, invoice download, tracking

## API Endpoints

### Required Server Endpoints

The frontend expects the following endpoints:

#### Cart
- `GET /api/cart` - Get current cart
  - Returns: `{ ok: true, data: { items: [...], subtotal, currency } }`

#### Checkout
- `POST /api/checkout/create-order` - Create order
  - Body: `{ shipping_address, billing_address?, shipping_method, payment_method, coupon_code? }`
  - Returns: `{ ok: true, data: { orderId, amount, currency, payment_method } }`

- `POST /api/checkout/create-razorpay-order` - Create Razorpay order
  - Body: `{ orderId }`
  - Returns: `{ ok: true, data: { razorpay_order_id, key_id } }`
  - **Note**: `key_id` is safe to expose temporarily as it's public (test/live mode key)

- `POST /api/checkout/confirm-razorpay` - Verify and capture Razorpay payment
  - Body: `{ orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature }`
  - Returns: `{ ok: true, data: { orderId, paymentStatus } }`

#### Addresses
- `GET /api/addresses` - Get user addresses
  - Returns: `{ ok: true, data: Address[] }`

- `POST /api/addresses` - Create new address
  - Body: `{ name, street, city, state, pincode, country, phone? }`
  - Returns: `{ ok: true, data: Address }`

#### Shipping
- `GET /api/shipping/rates?to_pincode=XXXXXX` - Get shipping rates
  - Returns: `{ ok: true, data: [{ service, name, charge, estimatedDays }] }`

#### Orders
- `GET /api/orders/:id` - Get order details
  - Returns: `{ ok: true, data: Order }`

- `GET /api/orders/:id/invoice` - Download invoice PDF
  - Returns: PDF file with `Content-Disposition: attachment`

- `POST /api/admin/orders/:id/generate-invoice` - Generate invoice (admin)
  - Returns: `{ ok: true, data: { invoice } }`

#### Cart Coupons
- `POST /api/cart/apply-coupon` - Apply coupon code
  - Body: `{ code }`
  - Returns: `{ ok: true, data: { discount } }`

## Data Shapes

### Address
```typescript
interface Address {
  _id?: string;
  name: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
}
```

### Order
```typescript
interface Order {
  _id: string;
  userId: string;
  items: Array<{
    productId: string;
    name: string;
    qty: number;
    priceAt: number;
  }>;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment?: {
    status: 'pending' | 'completed' | 'failed';
    gateway: 'razorpay' | 'cod';
  };
  shippingAddress: Address;
  placedAt: string;
  shipment?: {
    awb?: string;
    status?: string;
  };
}
```

### Razorpay Order Response
```typescript
interface RazorpayOrderResponse {
  razorpay_order_id: string;
  key_id: string; // Public key (safe to expose)
}
```

## Razorpay Integration Flow

### 1. Create Order
```typescript
const order = await createOrder({
  shipping_address: {...},
  payment_method: 'razorpay',
  ...
});
```

### 2. Create Razorpay Order
```typescript
const razorpayOrder = await createRazorpayOrder(order.orderId);
// Returns: { razorpay_order_id, key_id }
```

### 3. Open Razorpay Checkout
```typescript
await openRazorpayCheckout({
  key: razorpayOrder.key_id,
  amount: order.amount * 100, // paise
  order_id: razorpayOrder.razorpay_order_id,
  handler: async (response) => {
    // Verify on server
    await confirmRazorpayPayment({
      orderId: order.orderId,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_order_id: response.razorpay_order_id,
      razorpay_signature: response.razorpay_signature,
    });
  },
});
```

### 4. Redirect to Confirmation
After successful payment verification, navigate to `/order/:id/confirmation`.

## Test/Live Mode

The server should determine test/live mode based on admin settings and return the appropriate `key_id`:

- **Test Mode**: Returns test key (e.g., `rzp_test_xxxxx`)
- **Live Mode**: Returns live key (e.g., `rzp_live_xxxxx`)

The client uses whatever `key_id` the server provides.

## Testing Locally

### 1. Test Razorpay Flow

1. **Get Test Keys**:
   - Sign up at https://razorpay.com
   - Go to Settings → API Keys
   - Copy test Key ID and Key Secret

2. **Configure Server**:
   - Set `RAZORPAY_KEY_ID=rzp_test_xxxxx` in `.env`
   - Set `RAZORPAY_KEY_SECRET=xxxxx` in `.env`
   - Set `RAZORPAY_ENABLED=true`

3. **Test Checkout**:
   - Add items to cart
   - Go to checkout
   - Select "Pay Online" (Razorpay)
   - Use test card: `4111 1111 1111 1111`
   - CVV: Any 3 digits
   - Expiry: Any future date

4. **Verify Webhook** (optional):
   ```bash
   curl -X POST http://localhost:5000/api/webhook/razorpay \
     -H "Content-Type: application/json" \
     -H "X-Razorpay-Signature: <signature>" \
     -d '{
       "event": "payment.captured",
       "payload": {
         "payment": {
           "entity": {
             "id": "pay_test123",
             "order_id": "order_test123",
             "status": "captured"
           }
         }
       }
     }'
   ```

### 2. Test COD Flow

1. Go to checkout
2. Select "Cash on Delivery"
3. Fill in address and shipping
4. Accept terms
5. Click "Place Order"
6. Should redirect to confirmation page immediately

### 3. Test Order Confirmation

1. After placing order, verify:
   - Order details displayed
   - Payment status shown
   - Invoice download works
   - Tracking link (if shipment created)

## Error Handling

### CSRF Token Expired
If `csrfFetch` returns CSRF error, the app automatically:
1. Calls `bootstrapCsrf()` to refresh token
2. Shows error message
3. Allows user to retry

### Payment Failure
- Razorpay modal shows error
- User can retry payment
- Order remains in "pending" status

### Network Errors
- Shows toast notification
- Allows retry
- Order state preserved

## Security Notes

1. **Never expose secrets**: Only `key_id` (public) is sent to client
2. **Server verification**: All payment signatures verified on server
3. **CSRF protection**: All state-changing requests use CSRF tokens
4. **HTTPS required**: Razorpay requires HTTPS in production

## Polling Behavior

Order confirmation page polls order status every 5 seconds for up to 1 minute to catch webhook-processed payments. Stops polling when:
- Payment status becomes `completed` or `failed`
- 12 polls completed (60 seconds)
- User navigates away

## Invoice Generation

- Invoice is generated server-side
- Download link available on confirmation page
- If invoice not ready, shows "Generate Invoice" button (admin only)
- PDF downloaded via `/api/orders/:id/invoice`

## Mobile Responsiveness

- Checkout form stacks on mobile
- Order summary moves below form on small screens
- Payment method selection is touch-friendly
- Address form is optimized for mobile input

## Accessibility

- All form fields have labels
- Radio buttons are keyboard accessible
- Error messages are announced
- Loading states use `aria-busy`
- Payment buttons have descriptive labels

## Git Commit

```bash
git add frontend
git commit -m "C.3: checkout & payments UI — Razorpay + COD integration, order confirmation"
git push origin feature/frontend-checkout
```

