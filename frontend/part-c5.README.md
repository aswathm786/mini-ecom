# Part C.5 - Frontend: Admin Dashboard

This document describes the implementation of the admin dashboard for the Handmade Harmony frontend. This part builds upon the global setup (C.1), public pages (C.2), checkout flow (C.3), and user account pages (C.4).

## Overview

Part C.5 provides a comprehensive admin interface with role-based access control (RBAC) for managing:
- **Orders**: View, update status, manual capture, refund, create shipment, invoice actions
- **Refunds**: List and process refunds via payment gateway
- **Shipments**: Create, track, cancel shipments (Delhivery integration)
- **Catalog**: Product management with quick stock edits
- **Users & Roles**: User management, role assignment, permission matrix
- **Settings**: Runtime-editable application settings (Razorpay, Delhivery, SMTP, toggles)
- **Webhooks**: View webhook events, inspect payloads, retry failed events
- **Audit Logs**: Searchable audit trail of admin actions
- **Reports**: Sales reports, top products, refunds summary with CSV export
- **Invoices**: Manual invoice generation and download

## File Structure

```
frontend/src/
├── admin/
│   ├── AdminApp.tsx              # Admin entry point
│   ├── AdminLayout.tsx            # Layout wrapper with sidebar
│   ├── AdminNav.tsx               # Sidebar navigation
│   ├── adminRoutes.tsx            # Admin route definitions
│   ├── components/
│   │   ├── FiltersBar.tsx         # Reusable filter bar
│   │   ├── ConfirmAction.tsx      # Confirmation modal
│   │   ├── DatasetTable.tsx       # Server-side paginated table
│   │   ├── OrderActions.tsx       # Order action buttons
│   │   ├── RefundDialog.tsx       # Refund creation modal
│   │   ├── ShipmentDialog.tsx     # Shipment creation modal
│   │   ├── ProductImageUploader.tsx # Image upload component
│   │   ├── PermissionMatrix.tsx   # Permission assignment UI
│   │   └── CSVExportButton.tsx    # CSV export button
│   ├── hooks/
│   │   ├── useAdminApi.ts         # Admin API wrapper
│   │   ├── useOrdersAdmin.ts      # Order management hook
│   │   ├── useRefunds.ts          # Refund management hook
│   │   ├── useShipments.ts        # Shipment management hook
│   │   ├── useUsersAdmin.ts       # User management hook
│   │   ├── useSettings.ts         # Settings management hook
│   │   ├── useWebhooks.ts         # Webhook events hook
│   │   └── useReports.ts          # Reports hook
│   └── pages/
│       ├── DashboardPage.tsx     # Admin dashboard
│       ├── OrdersPage.tsx         # Orders list
│       ├── OrderShowPage.tsx      # Order details & actions
│       ├── RefundsPage.tsx        # Refunds list & processing
│       ├── ShipmentsPage.tsx      # Shipments management
│       ├── CatalogPage.tsx        # Products list
│       ├── ProductEditPage.tsx    # Product edit form
│       ├── UsersPage.tsx          # Users list
│       ├── UserShowPage.tsx       # User details
│       ├── RolesPage.tsx          # Roles & permissions
│       ├── SettingsPage.tsx       # Application settings
│       ├── WebhooksPage.tsx       # Webhook events
│       ├── AuditLogsPage.tsx      # Audit logs
│       ├── ReportsPage.tsx        # Reports & analytics
│       └── InvoiceGeneratorPage.tsx # Invoice generation
└── styles/
    └── admin.css                  # Admin-specific styles
```

## API Contracts (Frontend ↔ Backend)

### Admin Authentication & RBAC

- `GET /api/me`
  - **Response**: `{ ok: true, data: { id, name, roles: ['admin'], permissions: ['order.view', 'order.refund', ...] } }`

- `GET /api/admin/permissions`
  - **Response**: `{ ok: true, data: [{ key: string, label: string, category: string }] }`

- `GET /api/admin/roles`
  - **Response**: `{ ok: true, data: [{ _id, name, description, permissions: [] }] }`

- `POST /api/admin/roles`
  - **Body**: `{ name: string, description?: string }`
  - **Response**: `{ ok: true, data: Role }`

- `PUT /api/admin/roles/:id`
  - **Body**: `{ permissionKeys: string[] }`
  - **Response**: `{ ok: true, data: Role }`

### Orders Management

- `GET /api/admin/orders?page=1&limit=20&status=paid&search=order_123&fromDate=...&toDate=...`
  - **Response**: `{ ok: true, data: { items: Order[], total: number, pages: number } }`

- `GET /api/admin/orders/:id`
  - **Response**: `{ ok: true, data: { order: Order, payment?: Payment, shipment?: Shipment } }`

- `PUT /api/admin/orders/:id`
  - **Body**: `{ status: string }`
  - **Response**: `{ ok: true }`

- `POST /api/admin/orders/:id/manual-capture`
  - **Response**: `{ ok: true, data: { paymentStatus: string } }`

- `POST /api/admin/orders/:id/refund`
  - **Body**: `{ amount: number, reason: string }`
  - **Response**: `{ ok: true, data: Refund }`

- `POST /api/admin/orders/:id/generate-invoice`
  - **Response**: `{ ok: true, data: Invoice }`

- `POST /api/admin/orders/:id/send-invoice`
  - **Response**: `{ ok: true }`

### Refunds Management

- `GET /api/admin/refunds?page=1&limit=20&status=pending&orderId=...`
  - **Response**: `{ ok: true, data: { items: Refund[], total: number, pages: number } }`

- `POST /api/admin/refunds/:id/process`
  - **Response**: `{ ok: true, data: { status: string } }`

### Shipments Management

- `GET /api/admin/shipments?page=1&limit=20&status=pending&orderId=...`
  - **Response**: `{ ok: true, data: { items: Shipment[], total: number, pages: number } }`

- `POST /api/admin/shipments`
  - **Body**: `{ orderId: string, serviceType?: string, weight?: number, dimensions?: {...} }`
  - **Response**: `{ ok: true, data: Shipment }`

- `POST /api/admin/shipments/:id/schedule-pickup`
  - **Response**: `{ ok: true }`

- `POST /api/admin/shipments/:id/cancel`
  - **Response**: `{ ok: true }`

- `GET /api/admin/shipments/:id/label`
  - **Response**: PDF file (Content-Type: application/pdf)

### Users Management

- `GET /api/admin/users?page=1&limit=20&search=email&role=admin&status=active`
  - **Response**: `{ ok: true, data: { items: User[], total: number, pages: number } }`

- `GET /api/admin/users/:id`
  - **Response**: `{ ok: true, data: User }`

- `GET /api/admin/users/:id/sessions`
  - **Response**: `{ ok: true, data: Session[] }`

- `PUT /api/admin/users/:id`
  - **Body**: `{ status?: string, roles?: string[] }`
  - **Response**: `{ ok: true, data: User }`

- `POST /api/admin/users/:id/sessions/revoke`
  - **Body**: `{ sessionId: string }`
  - **Response**: `{ ok: true }`

### Settings Management

- `GET /api/admin/settings`
  - **Response**: `{ ok: true, data: Settings }`

- `PUT /api/admin/settings`
  - **Body**: `{ 'payments.razorpay.enabled': boolean, 'payments.razorpay.key_id': string, ... }`
  - **Response**: `{ ok: true, data: Settings }`

### Webhooks Management

- `GET /api/admin/webhooks?page=1&limit=20&status=failed&eventType=payment.captured`
  - **Response**: `{ ok: true, data: { items: WebhookEvent[], total: number, pages: number } }`

- `GET /api/admin/webhooks/:id`
  - **Response**: `{ ok: true, data: WebhookEvent }`

- `POST /api/admin/webhooks/:id/retry`
  - **Response**: `{ ok: true }`

### Reports

- `GET /api/admin/reports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD`
  - **Response**: `{ ok: true, data: [{ date: string, orders: number, revenue: number, refunds: number }] }`

- `GET /api/admin/reports/top-products?limit=10`
  - **Response**: `{ ok: true, data: [{ productId: string, name: string, sales: number, revenue: number }] }`

- `GET /api/admin/reports/refunds?from=...&to=...`
  - **Response**: `{ ok: true, data: { total: number, amount: number, byStatus: {...} } }`

- `GET /api/admin/reports/sales.csv?from=...&to=...`
  - **Response**: CSV file (Content-Type: text/csv)

## Permissions Matrix

The admin dashboard uses a granular permission system. Common permissions include:

- **Orders**: `order.view`, `order.update`, `order.refund`, `order.capture`
- **Shipments**: `shipment.create`, `shipment.view`, `shipment.cancel`
- **Refunds**: `refund.view`, `refund.process`
- **Catalog**: `product.view`, `product.edit`, `product.create`, `product.delete`
- **Users**: `user.view`, `user.edit`, `user.delete`
- **Roles**: `role.view`, `role.create`, `role.edit`, `role.delete`
- **Settings**: `settings.view`, `settings.edit`
- **Reports**: `report.view`, `report.export`
- **Audit**: `audit.view`

## Role-Based Access Control

- All admin pages are protected by `AdminLayout` which checks for admin/manager/root roles
- Components check permissions using `useAuth().hasPermission()` before enabling actions
- Sensitive actions (refunds, manual capture, user deletion) require confirmation modals
- Settings with secrets (API keys, tokens) are masked and require "reveal" action (TODO: implement re-auth flow)

## User Flows

### Order Management Flow

1. Admin navigates to `/admin/orders`
2. Admin filters/searches orders
3. Admin clicks on an order to view details
4. Admin can:
   - Change order status (with confirmation)
   - Manually capture payment (if authorized)
   - Create refund (opens dialog, enters amount/reason)
   - Create shipment (opens dialog, enters service type/dimensions)
   - Generate invoice
   - Send invoice to customer email

### Refund Processing Flow

1. Admin navigates to `/admin/refunds`
2. Admin sees list of pending refunds
3. Admin clicks "Process" on a refund
4. Confirmation modal appears
5. On confirm, frontend calls `POST /api/admin/refunds/:id/process`
6. Server processes refund with gateway and updates status
7. UI updates to show refund status as "processing" or "completed"

### Settings Update Flow

1. Admin navigates to `/admin/settings`
2. Admin edits settings (toggles, API keys, store info)
3. Admin clicks "Save Settings"
4. Frontend calls `PUT /api/admin/settings` with updated values
5. Server persists to database and reloads runtime config
6. Success toast appears
7. Settings cache is updated

### Shipment Creation Flow

1. Admin navigates to order details or shipments page
2. Admin clicks "Create Shipment"
3. Dialog opens with form (service type, weight, dimensions)
4. Admin fills form and submits
5. Frontend calls `POST /api/admin/shipments`
6. Server creates shipment via Delhivery API
7. Shipment appears in list with AWB number
8. Admin can download label, schedule pickup, or cancel

## Security Considerations

- All admin API calls require authentication and CSRF tokens
- Role checks are performed both client-side (UI) and server-side (API)
- Sensitive settings (API keys, secrets) are masked in UI
- Destructive actions require confirmation modals
- Audit logs are created for important admin actions (settings changes, refunds, role changes)
- Session management allows admins to revoke user sessions

## Testing

### RefundsPage.test.tsx

Tests the refund processing flow:
- Renders refunds list
- Opens confirmation modal when "Process" is clicked
- Calls `processRefund` API on confirmation
- Shows success toast after processing

### SettingsPage.test.tsx

Tests the settings save flow:
- Renders settings form with current values
- Updates local state when toggles are changed
- Calls `updateSettings` API on form submit
- Shows success toast after saving
- Handles error cases

## Local Testing Checklist

1. **Test admin access**:
   - Log in as admin user (role: 'admin' or 'root')
   - Navigate to `/admin`
   - Verify sidebar navigation appears
   - Verify dashboard loads with stats

2. **Test order management**:
   - Navigate to `/admin/orders`
   - Filter orders by status
   - Click on an order to view details
   - Change order status (verify confirmation modal)
   - Create a refund (verify dialog opens, submit, verify API called)

3. **Test settings**:
   - Navigate to `/admin/settings`
   - Toggle "Enable Razorpay"
   - Change store name
   - Click "Save Settings"
   - Verify success toast appears
   - Verify settings are persisted (refresh page, verify values)

4. **Test audit logs**:
   - Perform an admin action (e.g., change order status, save settings)
   - Navigate to `/admin/audit`
   - Verify audit log entry appears with actor, action, object

5. **Test shipment creation** (mock):
   - Navigate to `/admin/shipments`
   - Click "Create Shipment"
   - Fill form and submit
   - Verify API call is made (mock response)
   - Verify shipment appears in list
   - Click "Label" to download (verify download triggered)

6. **Test role-based access**:
   - Log in as non-admin user
   - Try to navigate to `/admin`
   - Verify "Access Denied" message appears

## Suggested Git Commit

```bash
git add frontend
git commit -m "C.5: admin dashboard — orders, refunds, shipments, users/roles, settings, webhooks, reports"
git push origin feature/frontend-admin
```

## Notes

- All admin pages require authentication and admin/manager/root role
- Permission checks are performed client-side for UI, but server must enforce RBAC
- Settings secrets (Razorpay key_secret, Delhivery token, SMTP password) are masked with "Reveal" button (TODO: implement re-auth flow before revealing)
- Bulk actions (mass refund, mass cancel) should warn and confirm
- Audit logging is automatic for important actions (server-side)
- CSV exports are generated server-side and downloaded via browser
- Webhook event replay calls the webhook handler again (server must implement retry logic)
- Invoice generation creates PDF server-side (requires PDF library like `pdfkit` or `puppeteer`)

