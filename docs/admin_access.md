# Admin Access Guide

## Overview

The admin panel provides administrative control over the Handmade Harmony e-commerce platform. For security reasons, the admin link is **not displayed in the public navigation menu**. This document explains how to access the admin panel and configure security settings.

## Accessing the Admin Panel

### Direct URL Access

The admin panel can be accessed directly via URL:

```
http://your-domain.com/admin
```

or in development:

```
http://localhost:5173/admin
```

### Access Requirements

1. **Authentication**: You must be logged in to access the admin panel
2. **Admin Role**: Your account must have the `admin`, `root`, or `manager` role
3. **Valid Session**: Your session must be active and not expired

### What Happens If You Don't Have Access?

- **Not Logged In**: You will be redirected to the login page with a return URL parameter
- **Logged In But Not Admin**: You will be redirected to your account page with an error message
- **Session Expired**: You will be redirected to the login page

## Security Features

### Session Fingerprinting

The application uses browser fingerprinting to prevent session hijacking. Each session includes a unique fingerprint based on:

- User-Agent string
- IP address
- Accept-Language header
- Accept-Encoding header

**How It Works:**
- When you log in, a fingerprint is generated and stored with your session
- On each request, your current fingerprint is compared with the stored one
- If fingerprints don't match, the event is logged for security monitoring
- Optionally, sessions can be invalidated on fingerprint mismatch (configurable)

**Note**: Fingerprint validation is designed to be non-intrusive. Legitimate users should not experience issues unless their browser environment significantly changes.

### Configurable Session Expiration

Session expiration can be configured by administrators:

1. Log in to the admin panel
2. Navigate to **Settings** → **Authentication Settings**
3. Set the **Session Expiration** value (format: `7d`, `30d`, `1h`, `30m`, etc.)
4. Save settings

**Important**: 
- Changes apply to **new sessions only** (existing sessions keep their original expiration)
- Format: number followed by unit (`s`=seconds, `m`=minutes, `h`=hours, `d`=days)
- Examples: `7d` (7 days), `30d` (30 days), `1h` (1 hour), `30m` (30 minutes)
- Default: `7d` (7 days)

### Cookie Security

Session cookies are configured with security best practices:

- **HttpOnly**: Prevents JavaScript access (XSS protection)
- **Secure**: Enabled in production (HTTPS only)
- **SameSite**: Prevents CSRF attacks (default: `Lax`)

## Troubleshooting

### "Access Denied" Error

If you see an "Access Denied" message:

1. **Check Your Role**: Ensure your account has the `admin`, `root`, or `manager` role
2. **Contact Administrator**: If you believe you should have access, contact a system administrator
3. **Check Session**: Try logging out and logging back in

### Session Expired Errors

If you frequently see "Session expired" errors:

1. **Check Session Expiration Setting**: Verify the session expiration in admin settings
2. **Check Browser Settings**: Ensure cookies are enabled
3. **Check Network**: If using a VPN or proxy, IP changes may affect fingerprinting

### Fingerprint Mismatch Warnings

If you see fingerprint mismatch warnings in logs:

1. **Normal Behavior**: This is expected if you change networks, browsers, or devices
2. **Security Monitoring**: These events are logged for security analysis
3. **No Action Required**: Unless configured otherwise, mismatches are logged but don't block access

### Can't Access Admin Panel

If you cannot access the admin panel:

1. **Verify URL**: Ensure you're using the correct URL (`/admin`)
2. **Check Login**: Make sure you're logged in
3. **Check Role**: Verify your account has admin privileges
4. **Clear Cache**: Try clearing browser cache and cookies
5. **Try Different Browser**: Test in an incognito/private window

## Best Practices

1. **Bookmark the Admin URL**: Since the admin link is not in navigation, bookmark `/admin` for quick access
2. **Use Strong Passwords**: Admin accounts should use strong, unique passwords
3. **Enable 2FA**: If available, enable two-factor authentication for admin accounts
4. **Monitor Sessions**: Regularly review active sessions in your account settings
5. **Log Out When Done**: Always log out when finished with admin tasks, especially on shared computers

## Security Recommendations

1. **Limit Admin Accounts**: Only grant admin access to trusted personnel
2. **Regular Audits**: Review audit logs regularly for suspicious activity
3. **Session Management**: Configure appropriate session expiration based on your security needs
4. **Fingerprint Monitoring**: Monitor fingerprint mismatch logs for potential security issues
5. **IP Whitelisting**: Consider implementing IP whitelisting for admin access (if needed)

## Additional Resources

- [Main README](../README.md) - General project documentation
- [Deployment Guide](deploy.md) - Deployment instructions
- [Developer Guide](developer_guide.md) - Development setup and guidelines

