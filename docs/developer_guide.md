# Developer Guide

This guide is for developers who want to contribute to or extend Handmade Harmony.

---

## Table of Contents

- [Project Structure](#project-structure)
- [Development Setup](#development-setup)
- [Running Development Servers](#running-development-servers)
- [Running Tests](#running-tests)
- [Database Migrations](#database-migrations)
- [Adding New Features](#adding-new-features)
- [API Development](#api-development)
- [Frontend Development](#frontend-development)
- [Webhooks](#webhooks)
- [Code Style](#code-style)

---

## Project Structure

```
miniecom/
├── backend/                 # Node.js/Express backend
│   ├── src/
│   │   ├── controllers/    # Request handlers (MVC controllers)
│   │   ├── services/        # Business logic layer
│   │   ├── models/          # Data models/schemas
│   │   ├── routes/          # Express routes
│   │   ├── middleware/      # Express middleware
│   │   ├── db/              # Database connection
│   │   ├── config/          # Configuration
│   │   ├── utils/           # Utility functions
│   │   └── server.ts        # Express app entry point
│   ├── migrations/          # Database migration scripts
│   ├── scripts/             # Utility scripts
│   ├── test/                # Backend tests
│   └── package.json
├── frontend/                # React/Vite frontend
│   ├── src/
│   │   ├── pages/           # Page components
│   │   ├── components/      # Reusable components
│   │   ├── admin/           # Admin dashboard
│   │   ├── hooks/           # React hooks
│   │   ├── contexts/        # React contexts
│   │   ├── lib/             # Utility libraries
│   │   └── main.tsx         # React app entry point
│   ├── public/              # Static assets
│   ├── test/                # Frontend tests
│   └── package.json
├── scripts/                 # Project-wide scripts
├── docs/                    # Documentation
└── docker/                   # Dockerfiles
```

---

## Development Setup

### Prerequisites

- Node.js 18+
- npm 9+
- MongoDB 7+ (or Docker)
- Git

### Initial Setup

1. **Clone repository:**

   **On Windows (PowerShell) or Mac/Linux:**
   ```powershell
   # Same commands work on all platforms
   git clone https://github.com/yourusername/miniecom.git
   cd miniecom
   ```

2. **Install dependencies:**

   **On Windows (PowerShell) or Mac/Linux:**
   ```powershell
   # Same commands work on all platforms
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

3. **Configure environment:**

   **On Windows (PowerShell):**
   ```powershell
   Copy-Item .env.example .env
   # Edit .env with your settings
   notepad .env
   ```

   **On Mac/Linux:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   nano .env
   ```

4. **Start MongoDB:**

   **On Windows (PowerShell):**
   ```powershell
   # Using Docker (same on all platforms)
   docker compose up -d mongo
   
   # Or native MongoDB
   # Open Services (Win+R, type services.msc)
   # Find "MongoDB" service and start it
   # OR use PowerShell (as Administrator):
   Start-Service MongoDB
   ```

   **On Mac/Linux:**
   ```bash
   # Using Docker
   docker compose up -d mongo
   
   # Or native MongoDB
   sudo systemctl start mongod
   ```

5. **Run migrations:**

   **On Mac/Linux:**
   ```bash
   ./scripts/migrate.sh
   ```

   **On Windows (PowerShell):**
   ```powershell
   bash scripts/migrate.sh
   # OR using WSL:
   wsl bash scripts/migrate.sh
   ```

---

## Running Development Servers

### Backend Development Server

**With auto-reload (nodemon):**
```bash
cd backend
npm run dev
```

**Manual start:**
```bash
cd backend
npm run build
npm start
```

**Backend runs on:** http://localhost:3000

**API endpoints:**
- Health: http://localhost:3000/api/health
- API base: http://localhost:3000/api

### Frontend Development Server

**Vite dev server (with HMR):**
```bash
cd frontend
npm run dev
```

**Frontend runs on:** http://localhost:5173 (Vite default, configured in vite.config.ts)

**Features:**
- Hot Module Replacement (HMR)
- Fast refresh
- TypeScript support
- Tailwind CSS with JIT

### Running Both Together

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Or use Docker Compose (development mode):**
```bash
# Set USE_BIND_MOUNTS=1 in .env
docker compose up
```

---

## Running Tests

### Backend Tests

**Run all tests:**
```bash
cd backend
npm test
```

**Run with coverage:**
```bash
npm run test:coverage
```

**Run specific test file:**
```bash
npm test -- b1_checkout.test.ts
```

**Watch mode:**
```bash
npm run test:watch
```

### Frontend Tests

**Run all tests:**
```bash
cd frontend
npm test
```

**Watch mode:**
```bash
npm run test:watch
```

**Run specific test file:**
```bash
npm test -- b1_checkout.test.ts
```

---

## Database Migrations

### Creating a Migration

1. **Create migration file:**

   **On Mac/Linux:**
   ```bash
   touch backend/migrations/$(date +%Y%m%d%H%M%S)_your_migration_name.js
   ```

   **On Windows (PowerShell):**
   ```powershell
   # Create file with timestamp
   $timestamp = Get-Date -Format "yyyyMMddHHmmss"
   New-Item -Path "backend/migrations/${timestamp}_your_migration_name.js" -ItemType File
   ```

2. **Write migration:**
   ```javascript
   // backend/migrations/20240101120000_add_status_to_products.js
   
   module.exports = {
     async up(db, client) {
       // Migration logic here
       await db.collection('products').updateMany(
         { status: { $exists: false } },
         { $set: { status: 'active' } }
       );
       console.log('Migration applied: add_status_to_products');
     },
     
     async down(db, client) {
       // Rollback logic here
       await db.collection('products').updateMany(
         { status: 'active' },
         { $unset: { status: '' } }
       );
       console.log('Migration rolled back: add_status_to_products');
     }
   };
   ```

3. **Run migration:**

   **On Mac/Linux:**
   ```bash
   ./scripts/migrate.sh
   ```

   **On Windows (PowerShell):**
   ```powershell
   bash scripts/migrate.sh
   # OR using WSL:
   wsl bash scripts/migrate.sh
   ```

### Migration Best Practices

- **Idempotent:** Migrations should be safe to run multiple times
- **Test rollback:** Always implement `down()` method
- **Use transactions:** For multi-step migrations
- **Log operations:** Use `console.log()` for important steps
- **Version control:** Commit migrations with code changes

### Example: Adding a New Field

```javascript
module.exports = {
  async up(db, client) {
    // Add new field to existing collection
    await db.collection('products').updateMany(
      {},
      { $set: { featured: false } }
    );
    
    // Create index
    await db.collection('products').createIndex({ featured: 1 });
  },
  
  async down(db, client) {
    // Remove field
    await db.collection('products').updateMany(
      {},
      { $unset: { featured: '' } }
    );
    
    // Drop index
    await db.collection('products').dropIndex('featured_1');
  }
};
```

---

## Adding New Features

### Backend Feature

1. **Create service:**
   ```typescript
   // backend/src/services/YourService.ts
   export class YourService {
     static async yourMethod() {
       // Business logic
     }
   }
   ```

2. **Create controller:**
   ```typescript
   // backend/src/controllers/YourController.ts
   export class YourController {
     static async yourHandler(req: Request, res: Response) {
       const result = await YourService.yourMethod();
       res.json({ ok: true, data: result });
     }
   }
   ```

3. **Add route:**
   ```typescript
   // backend/src/routes/your.ts
   import { Router } from 'express';
   import { YourController } from '../controllers/YourController';
   
   const router = Router();
   router.get('/your-endpoint', YourController.yourHandler);
   export default router;
   ```

4. **Register route:**
   ```typescript
   // backend/src/routes/index.ts
   import yourRoutes from './your';
   router.use('/your', yourRoutes);
   ```

### Frontend Feature

1. **Create component:**
   ```typescript
   // frontend/src/components/YourComponent.tsx
   export function YourComponent() {
     return <div>Your Component</div>;
   }
   ```

2. **Create page:**
   ```typescript
   // frontend/src/pages/YourPage.tsx
   import { YourComponent } from '../components/YourComponent';
   
   export function YourPage() {
     return <YourComponent />;
   }
   ```

3. **Add route:**
   ```typescript
   // frontend/src/routes.tsx
   import { YourPage } from './pages/YourPage';
   
   {
     path: '/your-page',
     element: <YourPage />
   }
   ```

---

## API Development

### API Structure

**Base URL:** `http://localhost:3000/api`

**Authentication:**
- Most endpoints require authentication
- Use JWT token in `Authorization` header
- Get token via `/api/auth/login`

**CSRF Protection:**
- Get CSRF token: `GET /api/csrf-token`
- Include in requests: `X-CSRF-Token` header

### Example API Call

```typescript
// Get CSRF token
const csrfResponse = await fetch('http://localhost:3000/api/csrf-token');
const { token } = await csrfResponse.json();

// Make authenticated request
const response = await fetch('http://localhost:3000/api/products', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'X-CSRF-Token': token,
    'Content-Type': 'application/json'
  }
});
```

### Error Handling

**Standard error response:**
```json
{
  "ok": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

**Success response:**
```json
{
  "ok": true,
  "data": { ... }
}
```

---

## Frontend Development

### Component Structure

```typescript
// frontend/src/components/Example.tsx
import { useState, useEffect } from 'react';
import { csrfFetch } from '../lib/csrfFetch';

export function Example() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    csrfFetch('/api/endpoint')
      .then(res => res.json())
      .then(json => setData(json.data));
  }, []);
  
  return <div>{data && <p>{data.message}</p>}</div>;
}
```

### Using Hooks

```typescript
// frontend/src/hooks/useProducts.ts
export function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    csrfFetch('/api/products')
      .then(res => res.json())
      .then(json => {
        setProducts(json.data);
        setLoading(false);
      });
  }, []);
  
  return { products, loading };
}
```

### Styling

**Tailwind CSS:**
```tsx
<div className="bg-blue-500 text-white p-4 rounded-lg">
  Styled with Tailwind
</div>
```

**Custom CSS:**
```tsx
// frontend/src/styles/custom.css
import './custom.css';

<div className="custom-class">Content</div>
```

---

## Webhooks

### Implementing a Webhook Handler

1. **Create webhook controller:**
   ```typescript
   // backend/src/controllers/WebhookController.ts
   export class WebhookController {
     static async yourWebhook(req: Request, res: Response) {
       // Verify webhook signature
       const signature = req.headers['x-webhook-signature'];
       if (!verifySignature(signature, req.body)) {
         return res.status(401).json({ error: 'Invalid signature' });
       }
       
       // Process webhook
       await processWebhook(req.body);
       
       res.json({ ok: true });
     }
   }
   ```

2. **Add route:**
   ```typescript
   // backend/src/routes/index.ts
   router.post('/webhook/your-service', WebhookController.yourWebhook);
   ```

3. **Test locally:**
   ```bash
   # Use ngrok or similar to expose local server
   ngrok http 3000
   # Configure webhook URL in service dashboard
   ```

See [docs/payment_setup.md](payment_setup.md) for Razorpay webhook setup.

---

## Code Style

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Use interfaces for types
- Avoid `any` type

### Naming Conventions

- **Files:** `camelCase.ts` or `PascalCase.tsx`
- **Classes:** `PascalCase`
- **Functions:** `camelCase`
- **Constants:** `UPPER_SNAKE_CASE`

### Code Formatting

**Use Prettier:**

**On Windows (PowerShell) or Mac/Linux:**
```powershell
# Same commands work on all platforms
npm run format
```

**Use ESLint:**

**On Windows (PowerShell) or Mac/Linux:**
```powershell
# Same commands work on all platforms
npm run lint
```

---

## Debugging

### Backend Debugging

**Enable debug logs:**

**On Mac/Linux:**
```bash
DEBUG=* npm run dev
```

**On Windows (PowerShell):**
```powershell
$env:DEBUG="*"; npm run dev
```

**Use VS Code debugger:**
- Create `.vscode/launch.json`
- Set breakpoints
- Press F5 to debug

### Frontend Debugging

**React DevTools:**
- Install browser extension
- Inspect components and state

**Console logging:**
```typescript
console.log('Debug:', data);
```

---

## Building for Production

### Backend

**On Windows (PowerShell) or Mac/Linux:**
```powershell
# Same commands work on all platforms
cd backend
npm run build
npm start
```

### Frontend

**On Windows (PowerShell) or Mac/Linux:**
```powershell
# Same commands work on all platforms
cd frontend
npm run build
# Output in frontend/dist/
```

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a pull request

---

**Happy coding! 🚀**

