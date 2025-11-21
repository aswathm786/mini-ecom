# Troubleshooting Google OAuth 403 Error

## Error: "The given origin is not allowed for the given client ID"

This error means your current website origin (URL) is not authorized in Google Cloud Console.

**Note:** If Google login/signup is working but you still see this error, it's just the button rendering that's failing. The actual authentication works fine. However, you should still fix it to remove the error message.

### Step 1: Check Your Current Origin

1. Open your browser's Developer Console (F12)
2. Go to the Console tab
3. Look for a log message that says: `Initializing Google OAuth with:`
4. Note the `origin` value (e.g., `http://localhost:5173`)

**From your console log, I can see:**
- Origin: `http://localhost:5173`
- Client ID: ``

**You need to add `http://localhost:5173` to Google Cloud Console.**

### Step 2: Add Origin to Google Cloud Console

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Select your project

2. **Navigate to Credentials:**
   - Go to **APIs & Services** > **Credentials**
   - Find your OAuth 2.0 Client ID (the one you're using)
   - Click on it to edit

3. **Add Authorized JavaScript Origins:**
   - Scroll to **Authorized JavaScript origins**
   - Click **+ ADD URI**
   - Enter your origin exactly as shown in the console log
     - Example: `http://localhost:5173`
     - Example: `http://localhost:3000`
     - Example: `https://yourdomain.com`
   - **Important:** 
     - Don't include a trailing slash (`/`)
     - Use `http://` for localhost, `https://` for production
     - Include the port number if using localhost

4. **Add Authorized Redirect URIs (if needed):**
   - Scroll to **Authorized redirect URIs**
   - Click **+ ADD URI**
   - Add the same origin:
     - Example: `http://localhost:5173`
   - You can also add callback URLs:
     - Example: `http://localhost:5173/auth/callback`

5. **Save:**
   - Click **SAVE** at the bottom
   - Wait 2-5 minutes for changes to propagate

### Step 3: Verify Configuration

After saving, check that:
- ✅ Your origin is listed in **Authorized JavaScript origins**
- ✅ Your origin is listed in **Authorized redirect URIs**
- ✅ The Client ID matches what's in your settings

### Step 4: Test Again

1. **Wait 2-5 minutes** after saving (Google needs time to update)
2. **Hard refresh** your browser (Ctrl+Shift+R or Cmd+Shift+R)
3. **Clear browser cache** if needed
4. Try the Google login button again

### Common Issues

#### Issue: Still getting 403 after adding origin
**Solutions:**
- Make sure you waited 2-5 minutes after saving
- Check that the origin matches exactly (case-sensitive, no trailing slash)
- Verify you're using the correct Client ID
- Try clearing browser cache and cookies
- Check if you're using a different port than configured

#### Issue: Multiple ports (5173, 3000, etc.)
**Solution:**
- Add all ports you might use to **Authorized JavaScript origins**
- Example:
  ```
  http://localhost:5173
  http://localhost:3000
  http://localhost:3001
  ```

#### Issue: Using a different domain
**Solution:**
- Add the actual domain you're accessing the site from
- If using `127.0.0.1`, add: `http://127.0.0.1:5173`
- If using a custom domain, add: `https://yourdomain.com`

#### Issue: Client ID mismatch
**Solution:**
- Verify the Client ID in your admin settings matches the one in Google Cloud Console
- Make sure you're using the correct Client ID (test vs production)

### Quick Checklist

- [ ] Origin added to **Authorized JavaScript origins**
- [ ] Origin added to **Authorized redirect URIs**
- [ ] Waited 2-5 minutes after saving
- [ ] Hard refreshed the browser
- [ ] Client ID matches in both places
- [ ] No trailing slashes in origins
- [ ] Using correct protocol (http for localhost, https for production)

### Still Not Working?

1. **Check browser console** for the exact origin being used
2. **Verify Client ID** in admin settings matches Google Cloud Console
3. **Try a different browser** to rule out cache issues
4. **Check Google Cloud Console** for any error messages
5. **Verify OAuth consent screen** is configured (if required)

