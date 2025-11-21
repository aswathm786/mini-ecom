# Developer Documentation

Technical documentation for developers contributing to or extending Handmade Harmony.

## 📋 Contents

- [Architecture](architecture.md) - System design and patterns
- [API Reference](api-reference.md) - Complete API documentation
- [Database Schema](database-schema.md) - MongoDB collections
- [Contributing](contributing.md) - Contribution guidelines
- [Testing](testing.md) - Testing guide

## 🏗️ Project Structure

```
handmade-harmony/
├── backend/              # Node.js/Express backend
│   ├── src/
│   │   ├── controllers/ # Request handlers
│   │   ├── services/    # Business logic
│   │   ├── models/      # Data models
│   │   ├── routes/      # API routes
│   │   ├── middleware/  # Express middleware
│   │   └── utils/       # Utility functions
│   ├── migrations/      # Database migrations
│   └── test/            # Backend tests
├── frontend/            # React/Vite frontend
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── components/  # Reusable components
│   │   ├── admin/       # Admin dashboard
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Utilities
│   └── test/            # Frontend tests
├── scripts/             # Automation scripts
└── docs/                # Documentation
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 7+
- Git
- Docker (optional)

### Setup

```bash
# Clone repository
git clone https://github.com/aswathm786/mini-ecom.git
cd mini-ecom

# Install dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Configure
cp .env.example .env
# Edit .env with your settings

# Initialize database
bash scripts/init_schema.sh
bash scripts/migrate.sh
node scripts/seed_admin.js

# Start development servers
cd backend && npm run dev    # Terminal 1
cd frontend && npm run dev   # Terminal 2
```

## 🛠️ Development

### Backend Development

**Run dev server:**
```bash
cd backend
npm run dev  # Auto-reloads on changes
```

**Build:**
```bash
npm run build  # Outputs to dist/
```

**Run tests:**
```bash
npm test
npm run test:coverage
```

### Frontend Development

**Run dev server:**
```bash
cd frontend
npm run dev  # HMR enabled
```

**Build:**
```bash
npm run build  # Outputs to dist/
```

**Preview production build:**
```bash
npm run preview
```

## 🧪 Testing

**Backend tests:**
```bash
cd backend
npm test
npm run test:coverage
npm run test:watch
```

**Frontend tests:**
```bash
cd frontend
npm test
```

**E2E tests:** (Coming soon)

## 📡 API Development

### API Structure

- **Base URL:** `/api`
- **Authentication:** JWT Bearer tokens
- **CSRF:** Required for state-changing requests

### Creating New Endpoint

1. **Create Service:**
```typescript
// backend/src/services/YourService.ts
export class YourService {
  static async yourMethod() {
    // Business logic
  }
}
```

2. **Create Controller:**
```typescript
// backend/src/controllers/YourController.ts
export class YourController {
  static async yourHandler(req, res) {
    const result = await YourService.yourMethod();
    res.json({ ok: true, data: result });
  }
}
```

3. **Add Route:**
```typescript
// backend/src/routes/your.ts
import { Router } from 'express';
import { YourController } from '../controllers/YourController';

const router = Router();
router.get('/endpoint', YourController.yourHandler);
export default router;
```

4. **Register Route:**
```typescript
// backend/src/routes/index.ts
import yourRoutes from './your';
router.use('/your', yourRoutes);
```

## 🎨 Frontend Development

### Component Structure

```typescript
// frontend/src/components/YourComponent.tsx
import { useState, useEffect } from 'react';
import { csrfFetch } from '../lib/csrfFetch';

export function YourComponent() {
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
// frontend/src/hooks/useYourHook.ts
export function useYourHook() {
  const [state, setState] = useState();
  
  // Hook logic
  
  return { state, /* ...methods */ };
}
```

## 🗄️ Database

### MongoDB Collections

- `users` - User accounts
- `products` - Product catalog
- `orders` - Customer orders
- `categories` - Product categories
- `carts` - Shopping carts
- `payments` - Payment records
- `invoices` - Invoice records
- `reviews` - Product reviews

### Creating Migration

```bash
# Create migration file
touch backend/migrations/$(date +%Y%m%d%H%M%S)_your_migration.js
```

```javascript
// Migration file
module.exports = {
  async up(db) {
    // Forward migration
    await db.collection('products').updateMany(
      {},
      { $set: { featured: false } }
    );
  },
  
  async down(db) {
    // Rollback
    await db.collection('products').updateMany(
      {},
      { $unset: { featured: '' } }
    );
  }
};
```

## 🔐 Security

### Authentication

- **JWT tokens** for API authentication
- **Argon2id** for password hashing
- **CSRF tokens** for state-changing requests
- **Rate limiting** on auth endpoints

### Best Practices

- Always validate input
- Use parameterized queries
- Never expose secrets
- Implement proper authorization
- Log security events

## 📚 Code Style

### TypeScript

- Use TypeScript for type safety
- Enable strict mode
- Avoid `any` type
- Document complex functions

### Naming Conventions

- **Files:** `camelCase.ts`, `PascalCase.tsx`
- **Classes:** `PascalCase`
- **Functions:** `camelCase`
- **Constants:** `UPPER_SNAKE_CASE`

### Formatting

```bash
# Format code
npm run format

# Lint code
npm run lint
```

## 🔗 Useful Links

- [Architecture Guide](architecture.md)
- [API Reference](api-reference.md)
- [Database Schema](database-schema.md)
- [Contributing Guide](contributing.md)
- [Testing Guide](testing.md)

## 💬 Getting Help

- Check existing documentation
- Search GitHub issues
- Ask in discussions
- Open new issue

**Happy coding!** 🚀

