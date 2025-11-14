# Part C.4 - Frontend: User Account Pages

This document describes the implementation of the user account section for the Handmade Harmony frontend. This part builds upon the global setup (C.1), public pages (C.2), and checkout flow (C.3).

## Overview

Part C.4 provides a comprehensive account management interface where authenticated users can:
- **Profile Management**: Edit personal information, change email (with verification), enable/disable 2FA
- **Address Management**: Create, edit, delete, and set default shipping addresses
- **Order Management**: View order history, order details, download invoices, request returns
- **Invoice Management**: List and download invoices
- **Shipment Tracking**: View detailed tracking timeline for shipments
- **Support Tickets**: Create tickets, view threads, reply, and close tickets
- **Session Management**: View active sessions and revoke devices

## File Structure

```
frontend/src/
├── pages/account/
│   ├── AccountHome.tsx          # Account dashboard/overview
│   ├── ProfilePage.tsx          # Profile settings & 2FA
│   ├── AddressesPage.tsx       # Address list & management
│   ├── AddressForm.tsx          # Address create/edit form
│   ├── OrdersPage.tsx           # Order list with filters
│   ├── OrderDetailsPage.tsx     # Detailed order view
│   ├── InvoicesPage.tsx        # Invoice list
│   ├── TrackingPage.tsx         # Shipment tracking timeline
│   ├── TicketsPage.tsx          # Support ticket list
│   ├── TicketDetailsPage.tsx   # Ticket thread view
│   └── SessionsPage.tsx        # Active sessions management
├── components/account/
│   ├── OrderRow.tsx             # Order list item
│   ├── OrderItemsList.tsx      # Order items display
│   ├── InvoiceRow.tsx           # Invoice list item
│   ├── TicketRow.tsx            # Ticket list item
│   └── SessionRow.tsx           # Session list item
├── components/modals/
│   ├── ConfirmModal.tsx         # Reusable confirmation dialog
│   └── TicketCreateModal.tsx    # Ticket creation modal
├── components/Address/
│   ├── AddressCard.tsx          # Address display card
│   └── AddressFormFields.tsx    # Reusable address form fields
├── components/Tracking/
│   └── TrackingTimeline.tsx     # Shipment tracking timeline
├── hooks/
│   ├── useOrders.ts             # Order fetching & pagination
│   ├── useTickets.ts             # Ticket management
│   ├── useAddresses.ts          # Address CRUD operations
│   └── useSessions.ts           # Session management
├── lib/
│   ├── validators.ts            # Form validation helpers
│   └── fileUpload.ts            # File upload utility
└── styles/
    └── account.css              # Account-specific styles
```

## API Contracts (Frontend ↔ Backend)

### Profile Management

- `GET /api/me`
  - **Response**: `{ ok: true, data: { user: { id, email, firstName, lastName, phone, twoFactorEnabled, lastLogin } } }`

- `PUT /api/me`
  - **Body**: `{ firstName?, lastName?, phone? }`
  - **Response**: `{ ok: true, data: { user } }`

- `POST /api/me/email-change`
  - **Body**: `{ email: string }`
  - **Response**: `{ ok: true, message: "Verification email sent" }`

- `POST /api/me/enable-2fa`
  - **Response**: `{ ok: true, data: { secret: string, otpauth_url: string, qrcode_svg: string } }`

- `POST /api/me/verify-2fa`
  - **Body**: `{ code: string }`
  - **Response**: `{ ok: true }`

- `POST /api/me/disable-2fa`
  - **Response**: `{ ok: true }`

### Address Management

- `GET /api/addresses`
  - **Response**: `{ ok: true, data: Address[] }`

- `POST /api/addresses`
  - **Body**: `{ name, street, city, state, pincode, country, phone? }`
  - **Response**: `{ ok: true, data: Address }`

- `PUT /api/addresses/:id`
  - **Body**: `{ name?, street?, city?, state?, pincode?, country?, phone? }`
  - **Response**: `{ ok: true, data: Address }`

- `DELETE /api/addresses/:id`
  - **Response**: `{ ok: true }`

- `POST /api/addresses/:id/set-default`
  - **Response**: `{ ok: true }`

### Order Management

- `GET /api/orders?page=1&limit=20&status=paid&search=order_123`
  - **Response**: `{ ok: true, data: { items: Order[], total: number, pages: number } }`

- `GET /api/orders/:id`
  - **Response**: `{ ok: true, data: { order: Order, payment?: Payment, shipment?: Shipment } }`

- `POST /api/orders/:id/request-return`
  - **Body**: `{ reason: string, items: [{ order_item_id, qty }], attach_id? }`
  - **Response**: `{ ok: true, data: { ticketId: string } }`

- `GET /api/orders/:id/invoice`
  - **Response**: PDF file (Content-Type: application/pdf)

### Shipment Tracking

- `GET /api/shipments/:awb/track`
  - **Response**: `{ ok: true, data: { awb: string, events: TrackingEvent[], current_status?: string } }`

- `GET /api/shipments/:awb/label`
  - **Response**: PDF file (Content-Type: application/pdf)

### Support Tickets

- `GET /api/tickets?page=1`
  - **Response**: `{ ok: true, data: Ticket[] }`

- `GET /api/tickets/:id`
  - **Response**: `{ ok: true, data: { ticket: Ticket, messages: TicketMessage[] } }`

- `POST /api/tickets`
  - **Body**: `{ order_id?, subject: string, message: string, attachments?: string[] }`
  - **Response**: `{ ok: true, data: Ticket }`

- `POST /api/tickets/:id/reply`
  - **Body**: `{ message: string, attachments?: string[] }`
  - **Response**: `{ ok: true }`

- `POST /api/tickets/:id/close`
  - **Response**: `{ ok: true }`

- `POST /api/tickets/upload`
  - **Body**: `multipart/form-data` with `file` field
  - **Response**: `{ ok: true, data: { uploadId: string, filename: string } }`

### Session Management

- `GET /api/me/sessions`
  - **Response**: `{ ok: true, data: Session[] }`

- `POST /api/me/sessions/:session_id/revoke`
  - **Response**: `{ ok: true }`

## User Flows

### Profile Edit Flow

1. User navigates to `/account/profile`
2. User edits name, phone fields
3. User clicks "Save Changes"
4. Frontend validates fields client-side
5. Frontend calls `PUT /api/me` with updated data
6. On success, profile is updated and user sees success toast

### Email Change Flow

1. User enters new email in profile page
2. User clicks "Change Email"
3. Frontend calls `POST /api/me/email-change`
4. Server sends verification email
5. Frontend shows message: "Verification email sent. Please check your inbox."
6. User must verify new email before it becomes active

### 2FA Enable Flow

1. User clicks "Enable 2FA" on profile page
2. Frontend calls `POST /api/me/enable-2fa`
3. Server returns QR code SVG and secret
4. Frontend displays QR code and secret
5. User scans QR code with authenticator app
6. User enters 6-digit code from app
7. Frontend calls `POST /api/me/verify-2fa` with code
8. On success, 2FA is enabled

### Address Management Flow

1. User navigates to `/account/addresses`
2. User sees list of saved addresses
3. User can:
   - Click "Add New Address" to create
   - Click "Edit" on existing address
   - Click "Set Default" to mark as default
   - Click "Delete" (with confirmation)
4. Form validates pincode (6 digits), required fields
5. On save, address is created/updated via API

### Order View Flow

1. User navigates to `/account/orders`
2. User sees paginated list of orders
3. User can filter by status (All, Pending, Paid, etc.)
4. User can search by order ID
5. User clicks on order to view details
6. Order details page shows:
   - Order summary (items, total, status)
   - Shipping & billing addresses
   - Payment information
   - Shipment tracking (if available)
   - Invoice download button
   - Request return button (if delivered)

### Ticket Creation Flow

1. User navigates to `/account/tickets`
2. User clicks "Create Ticket"
3. Modal opens with form:
   - Subject (required)
   - Message (required)
   - Optional order ID (if from order page)
   - Optional file attachments
4. User uploads files (validated: images/PDF, max size)
5. Files are uploaded to `/api/tickets/upload`, returns upload IDs
6. Frontend calls `POST /api/tickets` with subject, message, upload IDs
7. Ticket is created and user is redirected to ticket details

### Session Revocation Flow

1. User navigates to `/account/sessions`
2. User sees list of active sessions with device info, IP, last active
3. Current session is marked with "This Device" badge
4. User clicks "Revoke" on a session
5. Confirmation modal appears
6. On confirm, frontend calls `POST /api/me/sessions/:id/revoke`
7. Session is removed from list

## 2FA Enrollment Representation

The 2FA enrollment flow is represented as follows:

1. **Initial State**: Profile page shows "Enable 2FA" button if 2FA is disabled
2. **Setup State**: After clicking "Enable 2FA", a setup section appears showing:
   - QR code (SVG) for scanning
   - Secret key (fallback if QR not available)
   - Input field for 6-digit verification code
   - "Verify" and "Cancel" buttons
3. **Verification**: User enters code, frontend calls `/api/me/verify-2fa`
4. **Success**: 2FA is enabled, setup UI is hidden, profile shows "Disable 2FA" button
5. **Disable**: User can disable 2FA (with confirmation) which calls `/api/me/disable-2fa`

## Testing Checklist

### Manual Testing Steps

1. **Profile Management**:
   - [ ] Navigate to `/account/profile` (requires login)
   - [ ] Edit name and phone, save changes
   - [ ] Request email change, verify message appears
   - [ ] Enable 2FA: scan QR code, enter code, verify success
   - [ ] Disable 2FA, verify confirmation dialog

2. **Address Management**:
   - [ ] Navigate to `/account/addresses`
   - [ ] Create new address with valid data
   - [ ] Edit existing address
   - [ ] Set default address
   - [ ] Delete address (verify confirmation)
   - [ ] Test validation: invalid pincode, missing required fields

3. **Order Management**:
   - [ ] Navigate to `/account/orders`
   - [ ] Filter orders by status
   - [ ] Search orders by ID
   - [ ] Click order to view details
   - [ ] Download invoice (verify PDF download)
   - [ ] Request return for delivered order

4. **Ticket Management**:
   - [ ] Navigate to `/account/tickets`
   - [ ] Create new ticket with subject and message
   - [ ] Upload attachment (image/PDF)
   - [ ] View ticket thread
   - [ ] Reply to ticket
   - [ ] Close ticket

5. **Session Management**:
   - [ ] Navigate to `/account/sessions`
   - [ ] Verify current session is marked
   - [ ] Revoke a session (verify confirmation)
   - [ ] Verify session is removed from list

### Automated Tests

- `OrdersPage.test.tsx`: Tests order list rendering, filtering, pagination, navigation
- `TicketsFlow.test.tsx`: Tests ticket creation modal, form submission, file upload

## Accessibility Features

- All form fields have proper `label` associations
- Modal dialogs trap focus and close on ESC
- Keyboard navigation supported for all interactive elements
- ARIA labels on buttons and status indicators
- Semantic HTML structure with proper headings
- Error messages are announced to screen readers

## Responsive Design

- Two-column layout on desktop (sidebar + main content)
- Single-column layout on mobile
- Tables scroll horizontally on small screens
- Modals are full-screen on mobile
- Touch-friendly button sizes and spacing

## Security Considerations

- All API calls use `csrfFetch()` for CSRF protection
- File uploads are validated (type, size) before upload
- Session revocation requires confirmation
- 2FA secret is only shown during enrollment
- Email changes require verification
- All account pages require authentication (redirect to login if not authenticated)

## Local Testing Checklist

1. **Start development server**:
   ```bash
   cd frontend && npm run dev
   ```

2. **Test authentication requirement**:
   - Navigate to `/account` without logging in
   - Verify redirect to `/login?return=/account`

3. **Test profile edit**:
   - Log in and navigate to `/account/profile`
   - Edit name and phone, save
   - Verify success message

4. **Test address CRUD**:
   - Navigate to `/account/addresses`
   - Create new address
   - Edit address
   - Delete address (with confirmation)

5. **Test order view**:
   - Navigate to `/account/orders`
   - Click on an order
   - Verify order details page shows all information
   - Click "Download Invoice" (requires backend implementation)

6. **Test ticket creation**:
   - Navigate to `/account/tickets`
   - Click "Create Ticket"
   - Fill form and submit
   - Verify ticket appears in list

## Suggested Git Commit

```bash
git add frontend
git commit -m "C.4: user account pages — profile, orders, invoices, tracking, tickets, sessions"
git push origin feature/frontend-account
```

## Notes

- All account pages require authentication. If user is not authenticated, they are redirected to `/login` with a `return` parameter.
- File uploads for tickets support images and PDFs only, with a maximum size limit (configurable via backend).
- Invoice download requires backend implementation of `/api/orders/:id/invoice` endpoint.
- Order return requests create support tickets automatically.
- Session management shows device information parsed from user agent strings.
- 2FA enrollment uses QR codes generated server-side (SVG format).

