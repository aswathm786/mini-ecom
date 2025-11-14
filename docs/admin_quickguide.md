# Admin Quick Guide

This guide shows you how to perform common admin tasks in Handmade Harmony.

---

## Table of Contents

- [Logging In](#logging-in)
- [Dashboard Overview](#dashboard-overview)
- [Managing Products](#managing-products)
- [Managing Categories](#managing-categories)
- [Viewing Orders](#viewing-orders)
- [Processing Refunds](#processing-refunds)
- [Downloading Invoices](#downloading-invoices)
- [Managing Users](#managing-users)
- [Managing Roles & Permissions](#managing-roles--permissions)
- [Configuring Settings](#configuring-settings)
- [Viewing Reports](#viewing-reports)

---

## Logging In

1. Go to: **http://localhost/admin** (or your domain)
2. Enter your admin credentials:
   - **Email:** The email you set in `ADMIN_EMAIL`
   - **Password:** The password you set in `ADMIN_PASSWORD`
3. Click "Login"

**First time?** Change your password after logging in:
- Click your profile icon (top right)
- Select "Change Password"
- Enter current password and new password

---

## Dashboard Overview

After logging in, you'll see the admin dashboard with:
- **Statistics:** Total orders, revenue, products, users
- **Recent Orders:** Latest orders with status
- **Quick Actions:** Links to common tasks
- **Notifications:** Important alerts

![Admin Dashboard](/docs/screenshots/admin_dashboard.png)

---

## Managing Products

### Create a New Product

1. Go to **Admin > Catalog**
2. Click **"Add New Product"** button
3. Fill in the form:
   - **Name:** Product name (e.g., "Handmade Dreamcatcher")
   - **Description:** Detailed description
   - **Price:** Price in INR (e.g., 1200)
   - **Category:** Select from dropdown
   - **Stock:** Available quantity
   - **Images:** Upload product images (drag & drop or click to browse)
   - **Status:** Active/Inactive
4. Click **"Save Product"**

![Add Product](/docs/screenshots/add_product.png)

### Edit a Product

1. Go to **Admin > Catalog**
2. Click on the product you want to edit
3. Make changes
4. Click **"Update Product"**

### Delete a Product

1. Go to **Admin > Catalog**
2. Find the product
3. Click **"Delete"** button
4. Confirm deletion

**Warning:** Deleting a product will remove it from all orders. Consider setting status to "Inactive" instead.

---

## Managing Categories

### Create a Category

1. Go to **Admin > Catalog > Categories**
2. Click **"Add Category"**
3. Fill in:
   - **Name:** Category name (e.g., "Handmade Jewelry")
   - **Slug:** URL-friendly name (auto-generated, can edit)
   - **Description:** Category description
4. Click **"Save"**

### Edit or Delete Category

1. Go to **Admin > Catalog > Categories**
2. Click on category to edit
3. Make changes and click **"Update"**
4. Or click **"Delete"** to remove (only if no products use it)

---

## Viewing Orders

### View All Orders

1. Go to **Admin > Orders**
2. You'll see a list of all orders with:
   - Order ID
   - Customer name
   - Total amount
   - Status (Pending, Processing, Shipped, Delivered, Cancelled)
   - Date

### View Order Details

1. Click on any order from the list
2. You'll see:
   - **Order Information:** Order ID, date, customer details
   - **Items:** Products ordered with quantities
   - **Shipping Address:** Delivery address
   - **Payment:** Payment method, transaction ID
   - **Status:** Current order status

![Order Details](/docs/screenshots/order_details.png)

### Update Order Status

1. Open order details
2. Find **"Order Status"** section
3. Select new status from dropdown:
   - **Pending:** Order received, not processed
   - **Processing:** Order being prepared
   - **Shipped:** Order shipped (enter tracking number)
   - **Delivered:** Order delivered
   - **Cancelled:** Order cancelled
4. Click **"Update Status"**

### Add Tracking Number

1. Open order details
2. Find **"Shipping"** section
3. Enter tracking number (AWB from Delhivery)
4. Click **"Update Tracking"**

---

## Processing Refunds

### Issue a Refund

1. Go to **Admin > Orders**
2. Open the order you want to refund
3. Click **"Issue Refund"** button
4. Fill in refund form:
   - **Amount:** Refund amount (partial or full)
   - **Reason:** Reason for refund
   - **Type:** Full refund or partial refund
5. Click **"Process Refund"**

**For Razorpay payments:**
- Refund will be processed automatically
- Money will be returned to customer's account
- You'll see refund status in order details

![Refund Process](/docs/screenshots/refund_process.png)

### View Refund History

1. Go to **Admin > Refunds**
2. See all refunds with:
   - Order ID
   - Amount
   - Status (Pending, Processed, Failed)
   - Date

---

## Downloading Invoices

### Download Invoice for Order

1. Go to **Admin > Orders**
2. Open the order
3. Click **"Download Invoice"** button
4. PDF invoice will download

**Invoice includes:**
- Order details
- Customer information
- Items with prices
- Tax breakdown
- Payment information

![Invoice Download](/docs/screenshots/invoice_download.png)

### Bulk Invoice Download

1. Go to **Admin > Orders**
2. Select multiple orders (checkboxes)
3. Click **"Download Invoices"** (bulk action)
4. ZIP file with all invoices will download

---

## Managing Users

### View All Users

1. Go to **Admin > Users**
2. See list of all registered users:
   - Email
   - Name
   - Role
   - Registration date
   - Status (Active/Inactive)

### Edit User

1. Click on user from list
2. Edit details:
   - Name, email, phone
   - Addresses
   - Roles and permissions
3. Click **"Update User"**

### Change User Role

1. Open user details
2. Find **"Roles"** section
3. Select roles:
   - **Customer:** Regular user
   - **Admin:** Admin access
   - **Support:** Support staff (limited access)
   - **Root:** Full access (use carefully)
4. Click **"Update Roles"**

### Deactivate User

1. Open user details
2. Find **"Status"** section
3. Change to **"Inactive"**
4. Click **"Update"**

**Note:** Inactive users cannot log in but their data is preserved.

---

## Managing Roles & Permissions

### View Roles

1. Go to **Admin > Settings > Roles & Permissions**
2. See all roles:
   - **Root:** Full access
   - **Admin:** Admin panel access
   - **Support:** Limited admin access
   - **Customer:** Regular user

### Create Custom Role

1. Go to **Admin > Settings > Roles & Permissions**
2. Click **"Add Role"**
3. Enter role name
4. Select permissions:
   - View orders
   - Process refunds
   - Manage products
   - Manage users
   - View reports
   - Manage settings
5. Click **"Save Role"**

### Assign Role to User

1. Go to **Admin > Users**
2. Open user details
3. Find **"Roles"** section
4. Select role(s) from dropdown
5. Click **"Update"**

---

## Configuring Settings

### Payment Settings

1. Go to **Admin > Settings > Payment**
2. Configure Razorpay:
   - **Key ID:** Your Razorpay Key ID
   - **Key Secret:** Your Razorpay Key Secret
   - **Webhook Secret:** Your webhook secret
   - **Test Mode:** Toggle ON for testing
3. Enable payment methods:
   - **Razorpay:** Online payments
   - **COD:** Cash on Delivery
4. Click **"Save Settings"**

See [docs/payment_setup.md](payment_setup.md) for detailed setup.

### Shipping Settings

1. Go to **Admin > Settings > Shipping**
2. Configure Delhivery:
   - **Token:** Your Delhivery API token
   - **Client ID:** Your Delhivery client ID
   - **Test Mode:** Toggle ON for testing
3. Set default shipping rates
4. Click **"Save Settings"**

See [docs/shipping_setup.md](shipping_setup.md) for detailed setup.

### Email Settings

1. Go to **Admin > Settings > Email**
2. Configure SMTP:
   - **SMTP Host:** smtp.example.com
   - **SMTP Port:** 587
   - **Username:** Your SMTP username
   - **Password:** Your SMTP password
   - **From Email:** noreply@yourstore.com
3. Test email:
   - Click **"Send Test Email"**
   - Enter your email address
   - Check inbox
4. Click **"Save Settings"**

### General Settings

1. Go to **Admin > Settings > General**
2. Configure:
   - **Store Name:** Your store name
   - **Store Email:** Contact email
   - **Store Phone:** Contact phone
   - **Currency:** INR (default)
   - **Tax Rate:** GST/VAT rate
3. Click **"Save Settings"**

---

## Viewing Reports

### Sales Report

1. Go to **Admin > Reports > Sales**
2. Select date range
3. View:
   - Total revenue
   - Number of orders
   - Average order value
   - Top products
   - Sales by category

![Sales Report](/docs/screenshots/sales_report.png)

### Order Report

1. Go to **Admin > Reports > Orders**
2. Filter by:
   - Date range
   - Status
   - Payment method
3. Export to CSV (optional)

### User Report

1. Go to **Admin > Reports > Users**
2. View:
   - Total users
   - New registrations
   - Active users
   - User growth over time

---

## Quick Tips

- **Use filters:** Most list pages have filters to find items quickly
- **Bulk actions:** Select multiple items for bulk operations
- **Search:** Use search bar to find products, orders, users
- **Keyboard shortcuts:** Some pages support keyboard shortcuts (see tooltips)
- **Export data:** Many pages allow exporting to CSV/Excel

---

## Need Help?

- See [docs/troubleshooting.md](troubleshooting.md) for common issues
- See [docs/faq.md](faq.md) for frequently asked questions
- Check logs: `storage/logs/ops.log`

---

**Happy managing! 🎉**

