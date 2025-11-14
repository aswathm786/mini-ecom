# Frequently Asked Questions (FAQ)

Common questions and answers about Handmade Harmony.

---

## General Questions

### Q1: What is Handmade Harmony?

**A:** Handmade Harmony is a complete e-commerce platform designed for selling handmade products, art, and crafts. It includes product catalog, shopping cart, checkout, payments, order management, shipping, and an admin dashboard.

### Q2: Do I need to know programming to use it?

**A:** No! The quick start guide is designed for non-coders. You can run the application using Docker with just a few commands. However, some technical knowledge helps for advanced configuration and troubleshooting.

### Q3: Is it free to use?

**A:** Yes, the software is free and open-source (MIT License). However, you'll need to pay for:
- Hosting (server/VPS)
- Payment gateway fees (Razorpay charges per transaction)
- Shipping services (Delhivery charges)
- Domain name (optional but recommended)

---

## Installation & Setup

### Q4: Can I run it without Docker?

**A:** Yes! See [docs/native_install.md](native_install.md) for instructions on running without Docker. You'll need to install Node.js, MongoDB, and npm separately.

### Q5: What operating systems are supported?

**A:** 
- **Server:** Ubuntu 20.04+ (recommended), Debian, CentOS
- **Development:** Windows 10/11, macOS, Linux
- **Docker:** Any system that supports Docker Desktop

### Q6: How long does initial setup take?

**A:** 
- **With Docker:** 10-15 minutes (including download time)
- **Without Docker:** 30-45 minutes (installing dependencies)

---

## Authentication & Security

### Q7: How do I enable two-factor authentication (2FA)?

**A:** See [docs/2fa_setup.md](2fa_setup.md) for complete instructions. You'll need:
1. Enable 2FA in admin settings
2. Install an authenticator app (Google Authenticator, Authy)
3. Scan QR code
4. Enter verification code

### Q8: How do I change my admin password?

**A:** 
1. Log in to admin panel
2. Click your profile icon (top right)
3. Select "Change Password"
4. Enter current password and new password
5. Click "Update Password"

**Or via command line:**
```bash
# Update ADMIN_PASSWORD in .env
node scripts/seed_admin.js
```

### Q9: What are CSRF tokens and why do I see errors?

**A:** CSRF (Cross-Site Request Forgery) tokens protect against malicious requests. If you see "CSRF token mismatch" errors:
1. Clear browser cookies
2. Refresh the page
3. Try again

The application automatically handles CSRF tokens - you don't need to do anything manually.

### Q10: How do sessions work?

**A:** Sessions keep you logged in. They're stored as cookies in your browser. If you're logged out frequently:
1. Check `SESSION_SECRET` in `.env` is set
2. Ensure cookies are enabled in browser
3. Don't use private/incognito mode (cookies may be cleared)

---

## Payments

### Q11: How do I set up Razorpay payments?

**A:** See [docs/payment_setup.md](payment_setup.md) for detailed setup:
1. Sign up at [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Get your API keys (test keys for development)
3. Add keys to `.env` or admin panel
4. Test with test card: 4111 1111 1111 1111

### Q12: Can I accept Cash on Delivery (COD)?

**A:** Yes! COD is supported:
1. Go to Admin > Settings > Payment
2. Toggle "Enable COD" to ON
3. Set minimum/maximum order amounts
4. Customers can select COD at checkout

### Q13: How do I test payments locally?

**A:** 
1. Use Razorpay test keys (starts with `rzp_test_`)
2. Use test card: 4111 1111 1111 1111
3. Use any future expiry date
4. Use any CVV
5. Use webhook testing tool in Razorpay dashboard

See [docs/payment_setup.md](payment_setup.md) for details.

### Q14: How do webhooks work?

**A:** Webhooks notify your server when payments are processed:
1. Configure webhook URL in Razorpay dashboard
2. Use ngrok for local testing: `ngrok http 3000`
3. Set `RAZORPAY_WEBHOOK_SECRET` in `.env`
4. Webhooks automatically update order status

---

## Shipping

### Q15: How do I set up Delhivery shipping?

**A:** See [docs/shipping_setup.md](shipping_setup.md):
1. Sign up at [Delhivery Developer Portal](https://delhivery.com/developer)
2. Get API token and client ID
3. Add to `.env` or admin panel
4. Test connection in admin panel

### Q16: Can I use other shipping providers?

**A:** Currently, only Delhivery is integrated. To add another provider:
1. Create a service in `backend/src/services/YourShippingService.ts`
2. Implement tracking and label generation
3. Update order processing to use new service

---

## Invoices & PDFs

### Q17: How do I generate PDF invoices?

**A:** See [docs/invoice_pdf.md](invoice_pdf.md):
1. PDFs are generated automatically when order is placed
2. Download from Admin > Orders > Order Details
3. Requires PDF library (already included in Docker setup)

### Q18: Can I customize invoice design?

**A:** Yes! Edit `backend/src/services/InvoiceService.ts`:
- Modify HTML template
- Change colors, fonts, layout
- Add your logo

### Q19: What if PDF generation fails?

**A:** 
1. Check logs: `docker compose logs api | grep -i invoice`
2. Ensure PDF library is installed (included in Docker)
3. For native install, install: `npm install pdfkit` or `npm install html-pdf`

---

## Database & Backups

### Q20: How do I backup my data?

**A:** 
1. **Automatic:** Backups run daily (configured via systemd/cron)
2. **Manual:** Run `./scripts/backup.sh`
3. Backups include: MongoDB, uploads, configuration

See [docs/backup_restore.md](backup_restore.md) for details.

### Q21: How do I restore from backup?

**A:** 
```bash
./scripts/restore.sh --backup storage/backups/YYYYMMDD_HHMMSS.tar.gz --confirm
```

See [docs/restore_quick.md](restore_quick.md) for quick restore steps.

### Q22: How often should I backup?

**A:** 
- **Daily:** Automated backups (recommended)
- **Before updates:** Always backup before major changes
- **Before migrations:** Backup before running database migrations

---

## Orders & Products

### Q23: How do I add products?

**A:** 
1. Go to Admin > Products > Add New
2. Fill in name, description, price, images
3. Select category
4. Set stock quantity
5. Click "Save"

See [docs/admin_quickguide.md](admin_quickguide.md) for details.

### Q24: How do I process refunds?

**A:** 
1. Go to Admin > Orders
2. Open the order
3. Click "Issue Refund"
4. Enter amount and reason
5. Click "Process Refund"

For Razorpay payments, refund is processed automatically.

### Q25: Can I export orders to CSV?

**A:** Yes! 
1. Go to Admin > Orders
2. Use filters to select orders
3. Click "Export to CSV"
4. File downloads with order data

---

## Technical Questions

### Q26: How do I update the application?

**A:** 
1. **Pull latest code:**
   ```bash
   git pull origin main
   ```

2. **Rebuild containers:**
   ```bash
   docker compose build --no-cache
   docker compose up -d
   ```

3. **Run migrations:**
   ```bash
   ./scripts/migrate.sh
   ```

### Q27: How do I add a new database migration?

**A:** 
1. Create file: `backend/migrations/YYYYMMDDHHMMSS_description.js`
2. Write `up()` and `down()` methods
3. Run: `./scripts/migrate.sh`

See [docs/developer_guide.md](developer_guide.md) for details.

### Q28: How do I view logs?

**A:** 
```bash
# Docker logs
docker compose logs
docker compose logs api --tail 100

# Application logs
tail -f storage/logs/ops.log
tail -f storage/logs/backups.log
```

### Q29: How do I enable HTTPS/SSL?

**A:** 
1. Install certbot: `sudo apt-get install certbot`
2. Get certificate: `sudo certbot certonly --standalone -d yourdomain.com`
3. Configure Nginx to use certificates
4. Update `APP_URL` in `.env` to `https://`

See [docs/checklist_go_live.md](checklist_go_live.md) for production checklist.

---

## Troubleshooting

### Q30: The site is slow. What can I do?

**A:** 
1. **Check server resources:** `docker stats`
2. **Optimize images:** Compress product images
3. **Enable caching:** Configure Nginx caching
4. **Database indexes:** Ensure indexes exist on frequently queried fields
5. **Upgrade server:** More RAM/CPU if needed

### Q31: I'm getting "out of memory" errors.

**A:** 
1. **Increase Docker memory limit** in Docker Desktop settings
2. **Add swap space** on server
3. **Restart containers:** `docker compose restart`
4. **Check for memory leaks:** Review application logs

### Q32: How do I reset everything and start fresh?

**A:** 
```bash
# Stop containers
docker compose down

# Remove volumes (WARNING: Deletes all data!)
docker compose down -v

# Remove images
docker compose down --rmi all

# Start fresh
./scripts/quick_start.sh
```

**⚠️ WARNING:** This deletes all data! Backup first if needed.

---

## Support

### Q33: Where can I get help?

**A:** 
1. **Documentation:** Check relevant docs in `docs/` folder
2. **Troubleshooting:** See [docs/troubleshooting.md](troubleshooting.md)
3. **GitHub Issues:** Open an issue with:
   - System information
   - Error messages
   - Logs
   - Steps to reproduce

### Q34: How do I report a bug?

**A:** 
1. Go to GitHub repository
2. Click "Issues" > "New Issue"
3. Include:
   - What you were doing
   - What happened
   - Error messages
   - System info
   - Logs

### Q35: Can I contribute to the project?

**A:** Yes! Contributions are welcome:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a pull request

---

**Still have questions?** Check the documentation or open a GitHub issue!

