# Two-Factor Authentication (2FA) Setup Guide

This guide explains how to enable and use two-factor authentication for your Handmade Harmony admin account.

---

## What is 2FA?

Two-factor authentication (2FA) adds an extra layer of security to your account. Instead of just a password, you need:
1. **Something you know:** Your password
2. **Something you have:** Your phone with an authenticator app

This makes it much harder for someone to hack your account, even if they know your password.

---

## Setting Up 2FA

### Step 1: Install an Authenticator App

**Choose one of these apps:**

- **Google Authenticator** (iOS/Android)
- **Authy** (iOS/Android/Desktop) - Recommended (backup codes)
- **Microsoft Authenticator** (iOS/Android)
- **1Password** (if you use it)

**Download from:**
- iOS: App Store
- Android: Google Play Store

### Step 2: Enable 2FA in Admin Panel

1. **Log in to admin panel:** http://localhost/admin
2. **Go to:** Profile > Security Settings (or Settings > Security)
3. **Find "Two-Factor Authentication"** section
4. **Click "Enable 2FA"** button

### Step 3: Scan QR Code

1. **You'll see a QR code** on the screen
2. **Open your authenticator app**
3. **Tap "Add Account"** or the "+" button
4. **Choose "Scan QR Code"**
5. **Point your phone camera at the QR code**
6. **The app will add your account**

### Step 4: Verify Setup

1. **Enter the 6-digit code** from your authenticator app
2. **Click "Verify and Enable"**
3. **2FA is now enabled!**

### Step 5: Save Backup Codes

**Important:** Save the backup codes shown!

1. **Copy the backup codes** (usually 8-10 codes)
2. **Save them somewhere safe:**
   - Password manager
   - Encrypted file
   - Print and store in safe place
3. **These codes let you log in if you lose your phone**

---

## Logging In with 2FA

### Normal Login Process

1. **Go to:** http://localhost/admin
2. **Enter your email and password**
3. **Click "Login"**
4. **You'll see a new screen:** "Enter 2FA Code"
5. **Open your authenticator app**
6. **Enter the 6-digit code** (it changes every 30 seconds)
7. **Click "Verify"**
8. **You're logged in!**

---

## If You Lose Your Phone

### Option 1: Use Backup Codes

1. **Go to login page**
2. **Enter email and password**
3. **Click "Login"**
4. **Click "Use Backup Code"** (or similar)
5. **Enter one of your backup codes**
6. **You're logged in!**
7. **Disable 2FA immediately** and set it up again

### Option 2: Contact Administrator

If you're the only admin and lost your phone:

1. **You'll need database access**
2. **Connect to MongoDB:**
   ```bash
   docker compose exec mongo mongosh "$MONGO_URI"
   ```
3. **Remove 2FA from your user:**
   ```javascript
   db.users.updateOne(
     { email: "your@email.com" },
     { $unset: { twoFactorSecret: "", twoFactorEnabled: "" } }
   )
   ```
4. **Log in normally** and set up 2FA again

---

## Disabling 2FA

### If You Want to Turn It Off

1. **Log in to admin panel**
2. **Go to:** Profile > Security Settings
3. **Find "Two-Factor Authentication"**
4. **Click "Disable 2FA"**
5. **Enter your password to confirm**
6. **2FA is now disabled**

**Note:** This is not recommended for security reasons!

---

## Best Practices

### ✅ Do:

- **Enable 2FA** for all admin accounts
- **Save backup codes** in a safe place
- **Use Authy** (has cloud backup) if you're worried about losing your phone
- **Test 2FA** after setting it up (log out and log back in)

### ❌ Don't:

- **Share your backup codes** with anyone
- **Store backup codes** in plain text files on your computer
- **Disable 2FA** unless absolutely necessary
- **Use the same authenticator app** for everything (use a dedicated app for 2FA)

---

## Troubleshooting

### "Invalid code" Error

**Possible causes:**
1. **Clock is wrong** - Authenticator apps use time. Make sure your phone's clock is correct
2. **Code expired** - Codes change every 30 seconds. Enter the current code
3. **Wrong account** - Make sure you're using the right account in the authenticator app

**Solution:**
- Check phone time is correct
- Wait for a new code (30 seconds)
- Re-scan QR code if needed

### "QR code doesn't work"

**Solution:**
1. **Try manual entry** instead:
   - Look for "Enter code manually" option
   - Enter the secret key shown
   - Give it a name (e.g., "Handmade Harmony Admin")

### "Lost my backup codes"

**Solution:**
1. **Disable 2FA** (see "If You Lose Your Phone" section)
2. **Re-enable 2FA** to get new backup codes
3. **Save the new codes!**

---

## For Developers

### How 2FA Works Technically

1. **Server generates secret:** Random string stored in user document
2. **QR code contains:** `otpauth://totp/HandmadeHarmony:email@example.com?secret=SECRET&issuer=HandmadeHarmony`
3. **Authenticator app:** Stores secret and generates time-based codes (TOTP)
4. **Login:** User enters code, server verifies using same secret and current time

### Implementation Details

**Backend:**
- Uses `speakeasy` or `otplib` library
- Secret stored in `users.twoFactorSecret`
- Verification: `totp.verify({ secret, token, window: 2 })`

**Frontend:**
- QR code generated using `qrcode` library
- 6-digit input field
- Backup codes displayed once

---

## Security Notes

- **2FA secrets are encrypted** in the database
- **Backup codes are hashed** (like passwords)
- **Codes expire after 30 seconds** (TOTP standard)
- **Rate limiting** prevents brute force attacks

---

**Your account is now more secure! 🔒**

Remember: 2FA is one of the best ways to protect your admin account. Enable it today!

