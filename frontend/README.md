# Frontend - Handmade Harmony

React + Vite + TypeScript frontend for the Handmade Harmony e-commerce platform.

## Quick Start

### Installation

**On Windows (PowerShell) or Mac/Linux:**
```powershell
# Same commands work on all platforms
npm install
```

### Development

Start the development server:

**On Windows (PowerShell) or Mac/Linux:**
```powershell
# Same commands work on all platforms
npm run dev
```

The app will be available at `http://localhost:5173` (Vite default port).

### Build

Build for production:

**On Windows (PowerShell) or Mac/Linux:**
```powershell
# Same commands work on all platforms
npm run build
```

The output will be in the `dist/` directory.

### Preview Production Build

**On Windows (PowerShell) or Mac/Linux:**
```powershell
# Same commands work on all platforms
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable UI components
│   ├── contexts/       # React contexts (Auth, etc.)
│   ├── layouts/       # Layout components
│   ├── lib/           # Utilities (CSRF, fetch helpers)
│   ├── pages/         # Page components
│   ├── styles/         # Global styles
│   ├── App.tsx         # Root component
│   ├── main.tsx        # Entry point
│   └── routes.tsx      # Route definitions
├── public/            # Static assets
├── test/              # Test files
└── index.html         # HTML template
```

## CSRF Protection

The app uses CSRF tokens for API requests. The token is managed in two ways:

### Client-Side Bootstrap

On app startup, `main.tsx` calls `bootstrapCsrf()` which:
1. Checks if a token exists in `<meta name="csrf-token">`
2. If not found, fetches from `/api/csrf-token`
3. Stores the token in the meta tag for use by `csrfFetch`

### Server-Side Injection (Recommended for Production)

For server-side rendering (SSR) or PHP integration, inject the CSRF token directly in the HTML:

```html
<meta name="csrf-token" content="<?php echo $csrfToken; ?>">
```

The client will detect this token and skip the bootstrap fetch.

### Using csrfFetch

All API calls should use the `csrfFetch` wrapper:

```typescript
import { csrfFetch } from '@/lib/csrfFetch';

const response = await csrfFetch('/api/endpoint', {
  method: 'POST',
  body: JSON.stringify({ data: 'value' }),
});

if (response.ok) {
  console.log(response.data);
} else {
  console.error(response.error);
}
```

The wrapper automatically:
- Adds `X-CSRF-Token` header
- Sets `credentials: 'include'` for cookies
- Sets `Content-Type: application/json` for JSON bodies
- Returns consistent `{ ok, data, error }` envelope
- Redirects to `/login` on 401

## Authentication

Authentication is managed via `AuthContext`:

```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();

  // Use auth state and methods
}
```

### Auth Flow

1. **Login**: User submits credentials → `login()` → API call → User stored in context + localStorage
2. **Logout**: `logout()` → API call → User cleared from context + localStorage
3. **Session Persistence**: User data stored in localStorage, verified on app load

### Protected Routes

To protect routes, check `isAuthenticated`:

```typescript
if (!isAuthenticated) {
  navigate('/login');
}
```

Route-level protection will be added in later parts.

## Routing

Routes are defined in `src/routes.tsx` using React Router v6:

- `/` - Home page
- `/product/:slug` - Product detail
- `/cart` - Shopping cart
- `/login` - Login page
- `/register` - Registration
- `/account` - User account
- `/admin/*` - Admin dashboard

## Styling

The app uses Tailwind CSS with a custom configuration:

- Primary color: Red (`primary-600`)
- Responsive breakpoints: `sm`, `md`, `lg`
- Custom utilities in `src/styles/main.css`

### Custom Classes

- `.sr-only` - Screen reader only content
- `.form-input` - Form input styling
- `.card` - Card component styling

## Development Scripts

**On Windows (PowerShell) or Mac/Linux:**
```powershell
# Same commands work on all platforms
npm run dev        # Start dev server
npm run build      # Build for production
npm run preview    # Preview production build
npm run typecheck  # Type check without building
npm run lint       # Run ESLint
npm run format     # Format code with Prettier
```

## Testing

Run tests:

**On Windows (PowerShell) or Mac/Linux:**
```powershell
# Same commands work on all platforms
npm test
```

Tests use Vitest and React Testing Library. Example test in `test/csrfFetch.test.tsx`. Run tests with `npm test`.

## API Integration

The frontend expects API endpoints at `/api/*`. In development, Vite proxies these to `http://localhost:3000` (configured in `vite.config.ts`). The proxy target is configurable via the `VITE_API_URL` environment variable.

For production, ensure the API is accessible at the same origin or configure CORS appropriately.

## Environment Variables

Create `.env` for environment-specific config:

```env
VITE_API_URL=http://localhost:3000
# For Docker: VITE_API_URL=http://api:3000
```

Access in code via `import.meta.env.VITE_API_URL`.

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES2020+ features
- CSS Grid and Flexbox

## Accessibility

The app includes:
- Keyboard navigation support
- ARIA labels and roles
- Skip-to-content link
- Focus indicators
- Semantic HTML

## Next Steps

This is Part C.1 - global setup. Future parts will add:
- Product listings and detail pages
- Shopping cart functionality
- Checkout flow
- Admin panel
- Order management
- And more...
