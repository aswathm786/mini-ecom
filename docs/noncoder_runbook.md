# Non-Coder Runbook - Simple Step-by-Step Guide

This guide is written in simple language for people who aren't programmers. Every step is explained clearly.

---

## What You'll Learn

By the end of this guide, you'll know how to:
- Get the project running on your computer
- Add products to your store
- View and manage orders
- Handle common problems

---

## Part 1: Getting Started

### What is Handmade Harmony?

Handmade Harmony is a website where you can sell your handmade products. Think of it like your own online store, similar to Etsy, but you control everything.

### What You Need

- A computer (Windows, Mac, or Linux)
- Internet connection
- About 30 minutes of time
- Basic computer skills (clicking, typing, copying/pasting)

---

## Part 2: Installing Docker (The Easy Way)

### What is Docker?

Docker is like a magic box that contains everything your store needs to run. Instead of installing many programs separately, Docker does it all for you.

### Installing Docker on Windows

1. **Open your web browser**
2. **Go to:** https://www.docker.com/products/docker-desktop
3. **Click the big "Download" button**
4. **Wait for the file to download** (it's big, about 500MB, so it might take a few minutes)
5. **Find the downloaded file** (usually in your Downloads folder)
6. **Double-click it** to start installing
7. **Follow the instructions** (click "Next" when asked)
8. **When it asks to restart your computer, say "Yes"**
9. **After restart, look for Docker Desktop icon** in your system tray (bottom right corner)
10. **Click it and wait for it to start** (you'll see a green icon when ready)

**That's it!** Docker is now installed.

### Installing Docker on Mac

1. **Open your web browser**
2. **Go to:** https://www.docker.com/products/docker-desktop
3. **Click "Download for Mac"**
4. **Wait for download to finish**
5. **Open the downloaded file** (it's a .dmg file)
6. **Drag Docker to your Applications folder**
7. **Open Docker from Applications**
8. **Enter your Mac password when asked**
9. **Wait for Docker to start** (you'll see a whale icon in the menu bar)

### Installing Docker on Linux (Ubuntu)

1. **Open Terminal** (press `Ctrl + Alt + T`)
2. **Copy and paste this command:**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   ```
   Press Enter
3. **Copy and paste this command:**
   ```bash
   sudo sh get-docker.sh
   ```
   Press Enter and type your password when asked
4. **Wait for it to finish** (this takes a few minutes)
5. **You're done!**

---

## Part 3: Getting the Project

### Option 1: Download as ZIP (Easiest)

1. **Go to the GitHub page:** https://github.com/yourusername/miniecom
2. **Look for a green button that says "Code"**
3. **Click it**
4. **Click "Download ZIP"**
5. **Wait for download** (this might take a minute)
6. **Find the downloaded ZIP file** (usually in Downloads)
7. **Right-click it and choose "Extract All"** (Windows) or double-click it (Mac)
8. **Choose where to extract** (Desktop is fine)
9. **You now have a folder called "miniecom"**

### Option 2: Using Git (If You Have It)

1. **Open Terminal** (Mac/Linux) or **Command Prompt** (Windows)
2. **Type this command:**
   ```bash
   git clone https://github.com/yourusername/miniecom.git
   ```
3. **Press Enter**
4. **Wait for it to download**

---

## Part 4: Setting Up the Configuration

### What is .env?

The `.env` file is like a settings file. It tells the program how to connect to the database, what your admin password is, etc.

### Creating the .env File

1. **Open the miniecom folder** you just downloaded
2. **Look for a file called `.env.example`**
3. **Right-click it and choose "Copy"**
4. **Right-click in the same folder and choose "Paste"**
5. **You now have a file called `.env.example - Copy`**
6. **Right-click the copy and choose "Rename"**
7. **Delete everything and type:** `.env`
8. **Press Enter** (it might warn you about changing the extension, that's okay)

### Editing the .env File

1. **Right-click the `.env` file**
2. **Choose "Open with" > "Notepad"** (Windows) or **TextEdit** (Mac)
3. **Find these lines and change them:**

   ```
   ADMIN_EMAIL=admin@yourstore.com
   ```
   Change `admin@yourstore.com` to your email

   ```
   ADMIN_PASSWORD=YourSecurePassword123!
   ```
   Change `YourSecurePassword123!` to a strong password (at least 12 characters, mix of letters, numbers, and symbols)

   ```
   MONGO_ROOT_PASSWORD=changeme_to_something_secure
   ```
   Change `changeme_to_something_secure` to another strong password

4. **Save the file** (Ctrl+S on Windows, Cmd+S on Mac)

**Important:** Remember these passwords! Write them down somewhere safe.

---

## Part 5: Running the Store

### Using the Quick Start Script

1. **Open Terminal** (Mac/Linux) or **PowerShell** (Windows)
   - **Windows:** Press `Shift + Right-click` in the miniecom folder, choose "Open PowerShell window here"
   - **Mac:** Right-click folder, choose "Services" > "New Terminal at Folder"
   - **Linux:** Right-click folder, choose "Open Terminal Here"

2. **Type this command:**
   ```bash
   chmod +x scripts/quick_start.sh
   ```
   Press Enter

3. **Type this command:**
   ```bash
   ./scripts/quick_start.sh
   ```
   Press Enter

   **On Windows PowerShell, use:**
   ```powershell
   bash scripts/quick_start.sh
   ```

4. **Wait!** This will take 5-10 minutes the first time. You'll see lots of text scrolling. This is normal.

5. **When you see "Setup Complete!"** you're done!

### What Just Happened?

The script:
- Checked if Docker is installed
- Started all the services (database, website, admin panel)
- Set up the database
- Created your admin account
- Added some sample products

---

## Part 6: Opening Your Store

### Viewing the Store

1. **Open your web browser** (Chrome, Firefox, Safari, etc.)
2. **Type in the address bar:** `http://localhost`
3. **Press Enter**
4. **You should see your store!** 🎉

### Logging in as Admin

1. **Click "Login"** or go to: `http://localhost/admin`
2. **Enter your email:** (the one you set in ADMIN_EMAIL)
3. **Enter your password:** (the one you set in ADMIN_PASSWORD)
4. **Click "Login"**
5. **You're now in the admin panel!**

![Admin Login](/docs/screenshots/admin_login.png)
*Screenshot: Admin login page*

---

## Part 7: Adding Your First Product

### Step-by-Step

1. **In the admin panel, click "Products"** (in the menu on the left)
2. **Click "Add New Product"** button (usually at the top right)
3. **Fill in the form:**
   - **Name:** What your product is called (e.g., "Handmade Dreamcatcher")
   - **Description:** Tell customers about your product
   - **Price:** How much it costs (just the number, like 1200)
   - **Category:** Choose from the list (or create a new one)
   - **Stock:** How many you have (like 10)
   - **Images:** Click "Upload" and choose photos of your product
4. **Click "Save Product"**
5. **Done!** Your product is now in the store.

![Add Product](/docs/screenshots/add_product.png)
*Screenshot: Add product form*

---

## Part 8: Viewing Orders

### When Someone Orders

1. **Go to Admin > Orders**
2. **You'll see a list of all orders**
3. **Click on an order to see details:**
   - Who ordered
   - What they ordered
   - Where to ship it
   - How they paid

![Order Details](/docs/screenshots/order_details.png)
*Screenshot: Order details page*

### Updating Order Status

1. **Open an order**
2. **Find "Order Status"** section
3. **Choose a status:**
   - **Pending:** Just received
   - **Processing:** Getting it ready
   - **Shipped:** Sent to customer
   - **Delivered:** Customer received it
4. **Click "Update Status"**

---

## Part 9: Common Problems and Solutions

### Problem: "Docker is not running"

**What it means:** Docker isn't started on your computer.

**Solution:**
1. **Open Docker Desktop** (look for the icon)
2. **Wait for it to start** (green icon means ready)
3. **Try again**

### Problem: "Port already in use"

**What it means:** Another program is using the same port.

**Solution:**
1. **Close other programs** that might be using ports 80 or 3000
2. **Or change the ports** in `.env`:
   ```
   FRONTEND_PORT=8080
   API_PORT=3001
   ```

### Problem: "Cannot connect to database"

**What it means:** The database isn't running.

**Solution:**
1. **Open Terminal/PowerShell**
2. **Type:** `docker compose ps`
3. **Check if "mongo" is running**
4. **If not, type:** `docker compose restart`

### Problem: "Admin login doesn't work"

**What it means:** Wrong email or password.

**Solution:**
1. **Check your `.env` file** - make sure ADMIN_EMAIL and ADMIN_PASSWORD are correct
2. **Recreate admin user:**
   - Open Terminal in the project folder
   - Type: `node scripts/seed_admin.js`
   - Press Enter

---

## Part 10: Daily Tasks

### Starting the Store

Every time you want to use the store:

1. **Open Docker Desktop** (make sure it's running)
2. **Open Terminal in the project folder**
3. **Type:** `docker compose up -d`
4. **Press Enter**
5. **Wait 30 seconds**
6. **Open browser:** `http://localhost`

### Stopping the Store

When you're done:

1. **Open Terminal in the project folder**
2. **Type:** `docker compose down`
3. **Press Enter**
4. **Store is stopped**

### Adding More Products

Just repeat Part 7 whenever you want to add products!

---

## Part 11: Getting Help

### If You're Stuck

1. **Check the logs:**
   - Open Terminal
   - Type: `docker compose logs`
   - Look for error messages (they're usually in red)

2. **Check the troubleshooting guide:** [docs/troubleshooting.md](troubleshooting.md)

3. **Ask for help:**
   - Open a GitHub issue
   - Include:
     - What you were trying to do
     - What error you saw
     - Your operating system (Windows/Mac/Linux)
     - The error messages from logs

---

## Quick Reference

### Important URLs

- **Store:** http://localhost
- **Admin:** http://localhost/admin
- **Health Check:** http://localhost:3000/api/health

### Important Commands

```bash
# Start store
docker compose up -d

# Stop store
docker compose down

# View logs
docker compose logs

# Check status
docker compose ps
```

### Important Files

- **`.env`** - Your settings file (keep it secret!)
- **`storage/logs/`** - Log files (for troubleshooting)

---

## What's Next?

Now that you have the store running:

1. **Add your products** (see Part 7)
2. **Set up payments** (see [docs/payment_setup.md](payment_setup.md))
3. **Set up shipping** (see [docs/shipping_setup.md](shipping_setup.md))
4. **Customize your store** (add your logo, colors, etc.)

---

**Congratulations! 🎉 You've set up your online store!**

Remember: If you get stuck, check the troubleshooting guide or ask for help. Everyone starts somewhere!

