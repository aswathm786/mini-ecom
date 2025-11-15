# Backend - Handmade Harmony

Node.js + Express + TypeScript backend for Handmade Harmony e-commerce platform.

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB (native driver or Mongoose)
- **Authentication**: JWT + Argon2id password hashing
- **Security**: Helmet, CSRF protection, rate limiting
- **PDF Generation**: Puppeteer
- **Payments**: Razorpay SDK
- **Shipping**: Delhivery API

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration loader (env + DB settings)
│   ├── models/          # MongoDB models/schemas
│   ├── routes/          # Express routes
│   ├── controllers/     # Route controllers
│   ├── services/        # Business logic services
│   ├── middleware/      # Express middleware
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript type definitions
│   └── app.ts           # Express app setup
├── libs/                # Vendorized libraries (if needed)
├── uploads/             # Uploaded files (gitignored)
├── invoices/            # Generated invoices (gitignored)
├── logs/                # Application logs (gitignored)
├── package.json
└── tsconfig.json
```

## Setup (Part A.2)

### Prerequisites

- Node.js 18+
- MongoDB (local or remote)
- npm or yarn

### Install Dependencies

**On Windows (PowerShell) or Mac/Linux:**
```powershell
# Same commands work on all platforms
cd backend
npm install
```

### Environment Variables

Ensure `.env` file exists in the project root (copy from `.env.example`). Required variables for Part A.2:

- `MONGODB_URI`: MongoDB connection string (e.g., `mongodb://localhost:27017/handmade_harmony`)
- `JWT_SECRET`: Secret for JWT signing (min 32 characters)
- `CSRF_SECRET`: Secret for CSRF token generation
- `SESSION_SECRET`: Secret for session management
- `PORT`: Server port (default: 5000)

### Development

**On Windows (PowerShell) or Mac/Linux:**
```powershell
# Same commands work on all platforms
npm run dev
```

Server runs on `http://localhost:5000` (or port from `PORT` env var).

The server will:
1. Connect to MongoDB
2. Load runtime settings from `settings` collection
3. Start Express server with all security middlewares

### Build

**On Windows (PowerShell) or Mac/Linux:**
```powershell
# Same commands work on all platforms
npm run build
```

Compiles TypeScript to JavaScript in `dist/` directory.

### Production

**On Windows (PowerShell) or Mac/Linux:**
```powershell
# Same commands work on all platforms
npm start
```

Runs the compiled JavaScript from `dist/` directory.

### Testing

**On Windows (PowerShell) or Mac/Linux:**
```powershell
# Same commands work on all platforms
npm test
```

Runs Jest tests (currently includes webhook controller test).

## Configuration System

The backend uses a two-tier configuration system:

1. **Environment variables** (`.env` file)
2. **Database settings** (`settings` collection) - overrides `.env` at runtime

Settings from the database take precedence over `.env` values. This allows runtime configuration changes via the admin panel without restarting the server.

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/verify-2fa` - Verify 2FA code

### Products
- `GET /api/products` - List products
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)
- `DELETE /api/products/:id` - Delete product (admin)

### Cart
- `GET /api/cart` - Get user cart
- `POST /api/cart` - Add item to cart
- `PUT /api/cart/:itemId` - Update cart item
- `DELETE /api/cart/:itemId` - Remove cart item

### Orders
- `GET /api/orders` - List user orders
- `GET /api/orders/:id` - Get order details
- `POST /api/orders` - Create order (checkout)

### Payments
- `POST /api/payments/create-order` - Create Razorpay order
- `POST /api/payments/verify` - Verify payment
- `POST /api/webhook/razorpay` - Razorpay webhook

### Admin
- All admin endpoints require authentication and appropriate permissions
- See admin panel documentation for full list

## Security Features

- **CSRF Protection**: All state-changing requests require CSRF token
- **Rate Limiting**: Applied to auth endpoints and general API
- **Input Validation**: All inputs validated using Zod/Joi
- **XSS Prevention**: Content Security Policy headers
- **SQL Injection**: N/A (MongoDB), but input sanitization applied
- **Password Hashing**: Argon2id
- **Session Security**: Secure, HttpOnly cookies, device binding
- **2FA**: TOTP-based two-factor authentication

## Database Collections

- `users` - User accounts
- `roles` - RBAC roles
- `permissions` - Granular permissions
- `user_roles` - User-role assignments
- `sessions` - Active sessions/devices
- `products` - Product catalog
- `categories` - Product categories
- `carts` - Shopping carts
- `orders` - Orders
- `order_items` - Order line items
- `payments` - Payment records
- `refunds` - Refund records
- `invoices` - Invoice records
- `shipments` - Shipping records
- `webhook_events` - Webhook event log
- `audit_logs` - Audit trail
- `settings` - Runtime settings (override .env)
- `support_tickets` - Support tickets
- `coupons` - Discount coupons
- `jobs` - Background job queue
- `analytics` - Analytics events

## Testing

```bash
npm test
```

## Logging

Logs are written to `./logs` directory. Log levels: `error`, `warn`, `info`, `debug`.

## License

[Your License Here]

