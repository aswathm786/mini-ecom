# Admin Panel Documentation

Complete guide to using the Handmade Harmony admin panel.

## 📋 Contents

- [Access Control](access-control.md) - Admin access and permissions
- [User Management](user-management.md) - Managing customers and admins
- [Product Management](product-management.md) - Adding and managing products
- [Order Management](order-management.md) - Processing orders
- [Settings](settings.md) - Configuring store settings

## 🚀 Quick Start

### Accessing Admin Panel

1. Navigate to: `https://yourstore.com/admin`
2. Login with admin credentials
3. You'll see the admin dashboard

**Note:** The admin link is not displayed in public navigation for security.

### Default Credentials

From your `.env` file:
- **Email:** `ADMIN_EMAIL` value
- **Password:** `ADMIN_PASSWORD` value

**⚠️ Important:** Change the default password after first login!

## 🎯 Key Features

### Dashboard
- Sales overview
- Recent orders
- Key metrics
- Quick actions

### Product Management
- Add/edit/delete products
- Manage categories
- Bulk import from CSV
- Image upload
- Product variants
- Inventory tracking

### Order Management
- View all orders
- Process orders
- Update status
- Generate invoices
- Process refunds
- Track shipments

### User Management
- View customers
- Edit user details
- Assign roles
- Manage permissions
- View order history

### Settings
- Store information
- Payment gateway
- Shipping integration
- Email configuration
- AI assistant
- Security settings

## 🔒 Security Features

- Role-based access control (RBAC)
- Two-factor authentication (2FA)
- Session management
- IP whitelist (optional)
- Audit logging
- CSRF protection

## 📚 Detailed Guides

- [Access Control](access-control.md) - Permissions and roles
- [User Management](user-management.md) - Managing users
- [Product Management](product-management.md) - Product operations
- [Order Management](order-management.md) - Order processing
- [Settings](settings.md) - Configuration

## 🆘 Common Tasks

### Add a Product
1. Go to Catalog → Products → Add New
2. Fill in product details
3. Upload images
4. Set price and stock
5. Save

### Process an Order
1. Go to Orders
2. Click on order
3. Review details
4. Update status (Processing → Shipped)
5. Add tracking number
6. Save

### Create Admin User
1. Go to Users → Add New
2. Enter user details
3. Assign "Admin" role
4. Enable 2FA (recommended)
5. Save

### Configure Payment
1. Go to Settings → Payment
2. Enter Razorpay credentials
3. Toggle "Enable Razorpay"
4. Test connection
5. Save

## 🔗 Related Documentation

- [2FA Setup](../authentication/2fa-setup.md)
- [Payment Setup](../payment/razorpay-setup.md)
- [Shipping Setup](../shipping/delhivery-setup.md)
- [Email Setup](../email/smtp-setup.md)

