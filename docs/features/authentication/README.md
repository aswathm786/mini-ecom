# Authentication Documentation

User authentication, authorization, and security features.

## 📋 Contents

- [Setup](setup.md) - Authentication configuration
- [2FA Setup](2fa-setup.md) - Two-factor authentication

## 🔐 Authentication Methods

### Email/Password Login
- Standard email and password authentication
- Argon2id password hashing (OWASP recommended)
- Password strength requirements
- Account verification via email

### OTP Login
- One-time password sent via email
- Passwordless authentication option
- Temporary codes (valid 10 minutes)

### Google OAuth (Optional)
- Sign in with Google
- Automatic account creation
- Profile sync

## 🚀 Features

### User Registration
- Email verification
- Password strength validation
- Duplicate email detection
- Welcome email

### Password Reset
- Forgot password flow
- Email with reset link
- Token expiry (1 hour)
- Password change confirmation

### Two-Factor Authentication (2FA)
- TOTP-based (Time-based One-Time Password)
- Works with Google Authenticator, Authy, etc.
- Backup codes for recovery
- Optional for users, required for admins (configurable)

### Session Management
- JWT-based authentication
- Secure HTTP-only cookies
- Session fingerprinting (device binding)
- Configurable session expiry
- "Remember me" option
- Multi-device support

## ⚙️ Configuration

### Basic Settings

In `.env`:
```bash
# Secrets
JWT_SECRET=your_strong_secret_32chars_min
SESSION_SECRET=another_strong_secret
CSRF_SECRET=yet_another_secret

# Session
SESSION_LIFETIME=86400000  # 24 hours in ms
REMEMBER_ME_DURATION=2592000000  # 30 days

# Security
COOKIE_SECURE=true  # HTTPS only (production)
COOKIE_SAMESITE=strict
REQUIRE_ADMIN_2FA=true  # Force 2FA for admins

# Password Requirements
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBER=true
PASSWORD_REQUIRE_SPECIAL=true
```

### Admin Panel Settings

Settings → Authentication:
- Enable/disable registration
- Email verification requirements
- Password policies
- Session settings
- 2FA enforcement

## 🔒 Security Features

### Password Security
- Argon2id hashing (more secure than bcrypt)
- Salted hashes
- Password strength meter
- Password history (prevents reuse)
- Rate limiting on login attempts

### Session Security
- Session fingerprinting
- Device tracking
- IP validation
- Automatic logout on suspicious activity
- Concurrent session limits

### CSRF Protection
- Token-based CSRF prevention
- Automatic token refresh
- Header validation

### Rate Limiting
- Login attempts: 5 per 15 minutes
- Registration: 3 per hour
- Password reset: 3 per hour
- API requests: 100 per 15 minutes

## 👥 User Roles and Permissions

### Default Roles

**Customer (user)**
- Browse products
- Place orders
- View own orders
- Manage own profile
- Submit support tickets

**Admin**
- Full access to admin panel
- Manage products, orders, users
- View analytics
- Configure settings
- Access audit logs

**Manager**
- Manage products and inventory
- Process orders
- View reports
- Limited settings access

**Support**
- View and reply to support tickets
- View orders (read-only)
- View customers

### Custom Roles

Create custom roles in Admin Panel:
1. Go to Users → Roles
2. Create new role
3. Assign permissions
4. Save

## 📱 Two-Factor Authentication (2FA)

### Enable 2FA

**For Users:**
1. Login to account
2. Go to Account → Security
3. Click "Enable 2FA"
4. Scan QR code with authenticator app
5. Enter verification code
6. Save backup codes

**For Admins (Required):**
Admins must enable 2FA on first login (if `REQUIRE_ADMIN_2FA=true`).

### Supported Authenticator Apps
- Google Authenticator
- Microsoft Authenticator
- Authy
- 1Password
- Any TOTP-compatible app

### Backup Codes

- 10 single-use backup codes generated
- Use if authenticator app unavailable
- Download and store securely
- Regenerate after use

**📘 Complete Guide:** [2FA Setup](2fa-setup.md)

## 🔑 API Authentication

### Get JWT Token

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

Response:
```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### Use Token

```bash
GET /api/protected-endpoint
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🆘 Common Tasks

### Reset User Password (Admin)

1. Go to Users
2. Find user
3. Click "Reset Password"
4. User receives email with reset link

### Unlock Locked Account

Accounts auto-lock after 5 failed login attempts.

**Unlock:**
1. Admin → Users
2. Find user
3. Click "Unlock Account"

Or wait 15 minutes for automatic unlock.

### Disable User Account

1. Admin → Users
2. Find user
3. Toggle "Active" to OFF
4. User cannot login

### Force Logout All Sessions

1. Admin → Users
2. Find user
3. Click "Logout All Devices"

## 📚 Additional Resources

- [2FA Setup Guide](2fa-setup.md)
- [Google OAuth Setup](../email/oauth-setup.md)
- [Security Best Practices](../../deployment/production-checklist.md)

