# Google OAuth & Email Configuration Guide

This guide will help you set up Google OAuth authentication and email (SMTP) configuration for your locally hosted website.

## 📍 Google OAuth Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click on the project dropdown at the top
4. Click **"New Project"**
5. Enter a project name (e.g., "My E-Commerce App")
6. Click **"Create"**

### Step 2: Enable Google+ API

1. In your project, go to **"APIs & Services"** > **"Library"**
2. Search for **"Google+ API"** or **"Google Identity Services"**
3. Click on it and click **"Enable"**

### Step 3: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** > **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"OAuth client ID"**
4. If prompted, configure the OAuth consent screen first:
   - Choose **"External"** (unless you have a Google Workspace account)
   - Fill in the required fields:
     - App name: Your store name
     - User support email: Your email
     - Developer contact: Your email
   - Click **"Save and Continue"** through the steps
   - Add your email as a test user if needed
5. Back to creating credentials:
   - Application type: **"Web application"**
   - Name: "E-Commerce Web Client" (or any name you prefer)
   - **Authorized JavaScript origins:**
     ```
     http://localhost:5173
     http://localhost:3000
     http://localhost:3001
     ```
   - **Authorized redirect URIs:**
     ```
     http://localhost:5173
     http://localhost:5173/auth/callback
     http://localhost:3000
     http://localhost:3001
     ```
   - Click **"Create"**

### Step 4: Get Your Credentials

After creating, you'll see a popup with:
- **Client ID** (looks like: `123456789-abcdefghijklmnop.apps.googleusercontent.com`)
- **Client Secret** (looks like: `GOCSPX-xxxxxxxxxxxxx`)

**⚠️ Important:** Copy both values immediately - you won't be able to see the secret again!

### Step 5: Add Credentials to Your App

You can add these credentials in two ways:

#### Option A: Via Admin Panel (Recommended)

1. Start your application
2. Log in to the admin panel
3. Go to **Settings** page
4. Find **"Google OAuth Settings"** section
5. Enable **"Enable Google Login"**
6. Paste your **Client ID** in the "Google Client ID" field
7. Paste your **Client Secret** in the "Google Client Secret" field
8. Click **Save**

#### Option B: Via Environment Variables (Alternative)

Add to your `.env` file:
```bash
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

**Note:** The app prioritizes database settings over `.env` files, so using the admin panel is recommended.

### Callback URL Information

Since your app uses **Google One Tap / OAuth ID Token** (not traditional redirect flow), the callback happens on the frontend. However, you still need to configure these in Google Cloud Console:

**⚠️ IMPORTANT: If you see a 403 error "The given origin is not allowed for the given client ID", you need to add your origin to Google Cloud Console!**

**For local development, use:**
- **Authorized JavaScript origins:** 
  ```
  http://localhost:5173
  http://localhost:3000
  http://localhost:3001
  ```
- **Authorized redirect URIs:** 
  ```
  http://localhost:5173
  http://localhost:5173/auth/callback
  http://localhost:3000
  http://localhost:3001
  ```

**For production (when you deploy):**
- **Authorized JavaScript origins:** 
  ```
  https://yourdomain.com
  ```
- **Authorized redirect URIs:** 
  ```
  https://yourdomain.com
  https://yourdomain.com/auth/callback
  ```

**How to add origins:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** > **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Under **Authorized JavaScript origins**, click **+ ADD URI**
6. Add your origin (e.g., `http://localhost:5173`)
7. Under **Authorized redirect URIs**, click **+ ADD URI**
8. Add your redirect URI (e.g., `http://localhost:5173`)
9. Click **SAVE**
10. **Wait a few minutes** for changes to propagate (can take up to 5 minutes)

---

## 📧 Email (SMTP) Configuration

### Option 1: Gmail SMTP (Easiest for Testing)

#### Step 1: Enable 2-Factor Authentication

1. Go to your [Google Account](https://myaccount.google.com/)
2. Go to **Security**
3. Enable **2-Step Verification** if not already enabled

#### Step 2: Generate App Password

1. Go to [Google Account App Passwords](https://myaccount.google.com/apppasswords)
2. Select **"Mail"** as the app
3. Select **"Other (Custom name)"** as the device
4. Enter a name like "E-Commerce App"
5. Click **"Generate"**
6. Copy the 16-character password (it will look like: `abcd efgh ijkl mnop`)

#### Step 3: Configure in Your App

**Via Admin Panel:**
1. Go to **Settings** page
2. Find **"Email Settings - SMTP"** section
3. Enable **"Enable SMTP"**
4. Fill in:
   - **SMTP Host:** `smtp.gmail.com`
   - **SMTP Port:** `587`
   - **SMTP Secure:** `false` (unchecked)
   - **SMTP User:** Your Gmail address (e.g., `yourname@gmail.com`)
   - **SMTP Password:** The app password you generated (16 characters, no spaces)
   - **From Email:** `noreply@yourdomain.com` or your Gmail address
   - **From Name:** Your Store Name
5. Click **Save**

**Via Environment Variables (Alternative):**
```bash
SMTP_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=yourname@gmail.com
SMTP_PASS=your_16_char_app_password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=Your Store Name
```

### Option 2: Mailtrap (For Development/Testing)

Mailtrap is great for testing emails without sending real emails.

1. Sign up at [Mailtrap.io](https://mailtrap.io/) (free tier available)
2. Create an inbox
3. Go to **SMTP Settings** > **Node.js - Nodemailer**
4. Copy the credentials:
   - Host: `smtp.mailtrap.io`
   - Port: `2525` (or `465` for SSL)
   - Username: (from Mailtrap)
   - Password: (from Mailtrap)

**Configure in Admin Panel:**
- **SMTP Host:** `smtp.mailtrap.io`
- **SMTP Port:** `2525`
- **SMTP Secure:** `false`
- **SMTP User:** (from Mailtrap)
- **SMTP Password:** (from Mailtrap)

### Option 3: Other SMTP Providers

For production, consider:
- **SendGrid** - [sendgrid.com](https://sendgrid.com/)
- **Mailgun** - [mailgun.com](https://www.mailgun.com/)
- **AWS SES** - [aws.amazon.com/ses](https://aws.amazon.com/ses/)
- **Postmark** - [postmarkapp.com](https://postmarkapp.com/)

Each provider will give you:
- SMTP Host
- SMTP Port (usually 587 for TLS, 465 for SSL)
- SMTP User (usually your API key or username)
- SMTP Password (usually your API secret or password)

---

## 🔍 Testing Your Configuration

### Test Google OAuth

1. Start your application:
   ```bash
   # Backend
   cd backend
   npm run dev
   
   # Frontend (in another terminal)
   cd frontend
   npm run dev
   ```

2. Open `http://localhost:5173` in your browser
3. Try to log in with Google
4. You should see the Google sign-in popup
5. After signing in, you should be logged into your app

### Test Email

1. Make sure SMTP is configured in the admin panel
2. Trigger an email (e.g., user registration, password reset)
3. Check:
   - **Gmail:** Check your inbox (and spam folder)
   - **Mailtrap:** Check your Mailtrap inbox
   - **Other providers:** Check your email logs/dashboard

---

## 🚨 Troubleshooting

### Google OAuth Issues

**Error: "Google login is not configured"**
- Make sure you've added Client ID and Client Secret in the admin panel
- Check that the credentials are saved correctly

**Error: "Invalid client"**
- Verify your Client ID is correct
- Make sure you've added `http://localhost:5173` to authorized origins in Google Cloud Console

**Error: "Redirect URI mismatch"**
- Check that `http://localhost:5173` is in your authorized redirect URIs
- Make sure there are no typos or extra spaces

### Email Issues

**Error: "SMTP credentials not configured"**
- Make sure SMTP is enabled in the admin panel
- Verify SMTP User and SMTP Password are filled in

**Error: "Authentication failed"**
- For Gmail: Make sure you're using an App Password, not your regular password
- Verify the App Password is correct (16 characters, no spaces)
- Check that 2-Step Verification is enabled on your Google account

**Emails not sending:**
- Check your SMTP provider's logs/dashboard
- Verify firewall isn't blocking port 587 or 465
- For Gmail, check if "Less secure app access" is needed (usually not with App Passwords)

---

## 📝 Summary

### Google OAuth Credentials
- **Where to get:** [Google Cloud Console](https://console.cloud.google.com/)
- **What you need:** Client ID and Client Secret
- **Where to add:** Admin Panel > Settings > Google OAuth Settings
- **Callback URL for local:** `http://localhost:5173`

### Email Configuration
- **Gmail:** Use App Password (16 characters)
- **Mailtrap:** Free for testing
- **Where to add:** Admin Panel > Settings > Email Settings - SMTP
- **Required fields:** Host, Port, User, Password, From Email, From Name

### Your Local URLs
- **Frontend:** `http://localhost:5173`
- **Backend API:** `http://localhost:3001` (or `http://localhost:3000` in Docker)

---

## 🔗 Quick Links

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Account App Passwords](https://myaccount.google.com/apppasswords)
- [Mailtrap](https://mailtrap.io/)
- [SendGrid](https://sendgrid.com/)
- [Mailgun](https://www.mailgun.com/)

---

**Need help?** Check the main README.md or docs/troubleshooting.md for more information.

