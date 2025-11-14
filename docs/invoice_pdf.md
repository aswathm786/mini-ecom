# Invoice PDF Generation Guide

This guide explains how invoice PDF generation works in Handmade Harmony and how to set it up.

---

## How Invoice Generation Works

### Automatic Generation

**When an order is placed:**
1. Order is created and payment is confirmed
2. System automatically generates PDF invoice
3. Invoice is saved to `storage/uploads/invoices/`
4. Invoice is attached to order confirmation email
5. Available for download in admin panel

### Manual Generation

**You can also generate invoices manually:**
1. **Go to:** Admin > Orders
2. **Open an order**
3. **Click "Generate Invoice"** or "Download Invoice"
4. **PDF downloads** to your computer

---

## Invoice Contents

### What's Included

**Invoice contains:**
- **Invoice number:** Unique invoice ID
- **Order date:** When order was placed
- **Due date:** Payment due date
- **Store information:**
  - Store name
  - Address
  - Contact details
  - GST number (if applicable)
- **Customer information:**
  - Name
  - Email
  - Shipping address
  - Billing address
- **Items:**
  - Product name
  - Quantity
  - Unit price
  - Total price
- **Totals:**
  - Subtotal
  - Tax (GST/VAT)
  - Shipping charges
  - Discount (if any)
  - Grand total
- **Payment information:**
  - Payment method
  - Transaction ID
  - Payment status
- **Shipping information:**
  - Tracking number (if shipped)
  - Shipping method

---

## PDF Library Setup

### Using Docker (Already Included)

**If using Docker Compose:**
- PDF library is already installed in the backend container
- No additional setup needed!
- Uses `pdfkit` or `html-pdf` library

### Native Install (Without Docker)

**Install PDF library:**

**Option 1: Using pdfkit (Recommended)**
```bash
cd backend
npm install pdfkit
```

**Option 2: Using html-pdf**
```bash
cd backend
npm install html-pdf
```

**Note:** `html-pdf` requires `wkhtmltopdf` system package:
```bash
# Ubuntu/Debian
sudo apt-get install wkhtmltopdf

# macOS
brew install wkhtmltopdf

# Windows
# Download from: https://wkhtmltopdf.org/downloads.html
```

---

## Customizing Invoice Design

### Edit Invoice Template

**Location:** `backend/src/services/InvoiceService.ts`

**Current template uses:**
- HTML/CSS for layout
- PDF library to convert to PDF

### Change Colors

```typescript
// In InvoiceService.ts
const styles = {
  primaryColor: '#your-color',  // Change this
  secondaryColor: '#your-color',
  textColor: '#333333',
  borderColor: '#cccccc'
};
```

### Add Logo

1. **Place logo file:** `backend/public/logo.png`
2. **Update template:**
   ```typescript
   const logoPath = path.join(__dirname, '../public/logo.png');
   // Add to HTML template
   ```
3. **Logo appears** on invoice

### Change Font

```typescript
// In InvoiceService.ts
const fontFamily = 'Arial';  // Or 'Helvetica', 'Times-Roman', etc.
```

### Modify Layout

**Edit HTML template:**
```html
<!-- Invoice header -->
<div class="invoice-header">
  <h1>INVOICE</h1>
  <p>Invoice #{{invoiceNumber}}</p>
</div>

<!-- Customer info -->
<div class="customer-info">
  <h2>Bill To:</h2>
  <p>{{customerName}}</p>
  <p>{{customerAddress}}</p>
</div>

<!-- Items table -->
<table class="items-table">
  <!-- Table rows -->
</table>

<!-- Totals -->
<div class="totals">
  <!-- Total calculations -->
</div>
```

---

## Invoice Storage

### Where Invoices are Saved

**Location:** `storage/uploads/invoices/`

**Naming convention:**
- Format: `INV-YYYYMMDD-ORDERID.pdf`
- Example: `INV-20240101-12345.pdf`

### Accessing Invoices

**Via Admin Panel:**
1. Go to Admin > Orders
2. Open order
3. Click "Download Invoice"

**Via API:**
```bash
GET /api/orders/:orderId/invoice
```

**Direct file access:**
```
storage/uploads/invoices/INV-20240101-12345.pdf
```

---

## Email Integration

### Automatic Email Attachment

**When invoice is generated:**
1. Invoice PDF is attached to order confirmation email
2. Customer receives email with invoice
3. Invoice is also available in customer account

### Email Template

**Invoice email contains:**
- Subject: "Invoice for Order #12345"
- Body: "Thank you for your order. Please find invoice attached."
- Attachment: Invoice PDF

---

## Troubleshooting

### "PDF Generation Failed" Error

**Check:**
1. PDF library is installed
2. Storage directory exists and is writable
3. Sufficient disk space

**Solution:**
```bash
# Check PDF library
cd backend
npm list pdfkit  # or html-pdf

# Check storage permissions
ls -la storage/uploads/invoices/
chmod -R 775 storage/uploads/invoices/

# Check disk space
df -h
```

### "Cannot find module 'pdfkit'" Error

**Solution:**
```bash
cd backend
npm install pdfkit
# Or
npm install html-pdf
```

### "Permission denied" Error

**Solution:**
```bash
# Fix permissions
./scripts/fix-perms.sh

# Or manually
chmod -R 775 storage/
chown -R $USER:$USER storage/
```

### PDF is Blank or Corrupted

**Check:**
1. HTML template is valid
2. Data is being passed correctly
3. PDF library is working

**Solution:**
```bash
# Check logs
docker compose logs api | grep -i invoice

# Test PDF generation manually
node -e "
  const InvoiceService = require('./backend/src/services/InvoiceService');
  InvoiceService.generateInvoice(orderId);
"
```

### Invoice Not Attached to Email

**Check:**
1. Email service is configured
2. Invoice was generated successfully
3. File path is correct

**Solution:**
```bash
# Check email logs
docker compose logs api | grep -i email

# Check invoice file exists
ls -la storage/uploads/invoices/
```

---

## Advanced Customization

### Add Tax Breakdown

**Edit InvoiceService.ts:**
```typescript
// Add tax breakdown section
const taxBreakdown = {
  CGST: order.tax / 2,
  SGST: order.tax / 2,
  IGST: order.tax  // For inter-state
};
```

### Add Terms & Conditions

**Add to invoice template:**
```html
<div class="terms">
  <h3>Terms & Conditions</h3>
  <ul>
    <li>Payment due within 30 days</li>
    <li>Late payment charges apply</li>
    <li>Goods once sold will not be taken back</li>
  </ul>
</div>
```

### Add Barcode

**Add barcode to invoice:**
```typescript
// Install barcode library
npm install jsbarcode

// Generate barcode
const barcode = JsBarcode(orderId, {
  format: "CODE128",
  width: 2,
  height: 50
});
```

### Multi-language Support

**Add language support:**
```typescript
const invoiceLanguage = order.language || 'en';
const translations = {
  en: { invoice: 'Invoice', total: 'Total' },
  hi: { invoice: 'चालान', total: 'कुल' }
};
```

---

## Testing Invoice Generation

### Test Invoice Generation

```bash
# Create test order
# Or use existing order ID

# Generate invoice via API
curl -X POST http://localhost:3000/api/orders/ORDER_ID/invoice \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Verify Invoice

1. **Check file exists:**
   ```bash
   ls -la storage/uploads/invoices/
   ```

2. **Open PDF:**
   - Check all information is correct
   - Verify calculations
   - Check formatting

3. **Test email attachment:**
   - Place test order
   - Check email inbox
   - Verify PDF attachment

---

## Best Practices

### ✅ Do:

- **Generate invoices immediately** after payment
- **Store invoices securely** (backup regularly)
- **Include all required information** (GST, tax breakdown)
- **Use consistent numbering** (INV-YYYYMMDD-XXXXX)
- **Test invoice generation** before going live

### ❌ Don't:

- **Delete invoices** (keep for records)
- **Modify invoices** after generation (generate new if needed)
- **Store invoices in database** (use file system)
- **Expose invoice URLs** publicly (use authentication)

---

## Legal Requirements

### Invoice Requirements (India)

**Must include:**
- Invoice number
- Date
- Seller details (name, address, GST)
- Buyer details
- Item description
- HSN/SAC codes
- Tax rates (CGST, SGST, IGST)
- Total amount
- Signature (if required)

### Compliance

**Ensure invoices comply with:**
- GST regulations (if applicable)
- Local tax laws
- Accounting standards

---

## Support

### Troubleshooting

- Check logs: `docker compose logs api | grep -i invoice`
- See [docs/troubleshooting.md](troubleshooting.md)

### PDF Library Issues

- **pdfkit:** https://github.com/foliojs/pdfkit
- **html-pdf:** https://github.com/marcbachmann/node-html-pdf

---

**Your invoice system is ready! 📄**

Generate professional invoices for every order!

