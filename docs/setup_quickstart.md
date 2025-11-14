# Quick Start Guide - For Non-Coders 🚀

This guide is designed for people who want to get Handmade Harmony running quickly without needing to understand all the technical details.

**Time required:** 10-15 minutes

---

## What You'll Need

- A computer (Windows, Mac, or Linux)
- Internet connection
- Basic computer skills (copy/paste, opening files)

---

## Step 1: Install Docker

Docker is a tool that runs the application in a container. It's like a box that contains everything needed to run the app.

### Windows or Mac

1. Go to https://www.docker.com/products/docker-desktop
2. Download Docker Desktop for your operating system
3. Install it (double-click the installer and follow the prompts)
4. Restart your computer if asked
5. Open Docker Desktop and wait for it to start (you'll see a green icon in your system tray)

### Linux (Ubuntu)

Open a terminal (press `Ctrl+Alt+T`) and run:

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

Then log out and log back in.

**Test Docker is working:**
```bash
docker --version
```

You should see something like `Docker version 20.10.x`

---

## Step 2: Download the Project

### Option A: Download as ZIP (Easiest)

1. Go to the GitHub repository: https://github.com/yourusername/miniecom
2. Click the green "Code" button
3. Click "Download ZIP"
4. Extract the ZIP file to a folder (e.g., `C:\miniecom` on Windows or `~/miniecom` on Mac/Linux)

### Option B: Using Git (If you have it)

Open a terminal in the folder where you want the project and run:

```bash
git clone https://github.com/yourusername/miniecom.git
cd miniecom
```

---

## Step 3: Create Configuration File

1. Open the project folder
2. Find the file named `.env.example`
3. Copy it and rename the copy to `.env` (remove `.example`)

**On Windows:**
- Right-click `.env.example` > Copy
- Right-click in folder > Paste
- Rename the copy to `.env`

**On Mac/Linux:**
```bash
cp .env.example .env
```

4. Open `.env` in a text editor (Notepad on Windows, TextEdit on Mac, or any editor)

---

## Step 4: Fill in Basic Settings

In the `.env` file, find and update these lines (you can leave others as-is for now):

```bash
# Admin email and password (change these!)
ADMIN_EMAIL=admin@yourstore.com
ADMIN_PASSWORD=YourSecurePassword123!

# MongoDB password (change this!)
MONGO_ROOT_PASSWORD=changeme_to_something_secure
```

**Important:** 
- Use a strong password for `ADMIN_PASSWORD` (at least 12 characters)
- Use a strong password for `MONGO_ROOT_PASSWORD`
- Save the file after making changes

---

## Step 5: Run the Quick Start Script

Open a terminal in the project folder:

**Windows:**
- Press `Shift+Right-click` in the project folder
- Select "Open PowerShell window here" or "Open Command Prompt here"

**Mac/Linux:**
- Right-click the project folder
- Select "Open Terminal here" or "Open in Terminal"

Then run:

```bash
chmod +x scripts/quick_start.sh
./scripts/quick_start.sh
```

**On Windows (PowerShell):**
```powershell
bash scripts/quick_start.sh
```

**What this does:**
- Checks if Docker is installed
- Starts all services (database, backend, frontend)
- Sets up the database
- Creates an admin user
- Seeds sample data

**This will take 5-10 minutes the first time** (it downloads and builds everything).

You'll see lots of text scrolling. Wait until you see:
```
✅ All services are running!
✅ Setup complete!
```

---

## Step 6: Open the Website

Once the script finishes, open your web browser and go to:

**http://localhost**

You should see the Handmade Harmony homepage!

---

## Step 7: Log in as Admin

1. Click "Login" or go to: **http://localhost/admin**
2. Enter your admin credentials:
   - **Email:** The email you set in `ADMIN_EMAIL` (e.g., `admin@yourstore.com`)
   - **Password:** The password you set in `ADMIN_PASSWORD`

3. Click "Login"

You should now see the admin dashboard!

---

## What's Next?

### Browse the Store

- Go to http://localhost
- Browse sample products
- Add items to cart
- Try the checkout process (use test payment keys)

### Admin Tasks

- **Add Products:** Admin > Products > Add New
- **View Orders:** Admin > Orders
- **Manage Users:** Admin > Users
- **Configure Settings:** Admin > Settings

See [docs/admin_quickguide.md](admin_quickguide.md) for detailed admin tasks.

### Configure Payment Gateway

To accept real payments:
1. Sign up at [Razorpay](https://razorpay.com)
2. Get your API keys
3. Go to Admin > Settings > Payment
4. Enter your keys

See [docs/payment_setup.md](payment_setup.md) for details.

---

## Troubleshooting

### "Docker is not running"

**Solution:** Open Docker Desktop and wait for it to start (green icon in system tray).

### "Port already in use"

**Solution:** Another application is using port 80 or 3000. Either:
- Stop the other application
- Change ports in `.env`:
  ```bash
  FRONTEND_PORT=8080
  API_PORT=3001
  ```

### "Cannot connect to database"

**Solution:** 
1. Check if MongoDB container is running:
   ```bash
   docker compose ps
   ```
2. Restart containers:
   ```bash
   docker compose restart
   ```

### "Admin login doesn't work"

**Solution:**
1. Check `.env` has correct `ADMIN_EMAIL` and `ADMIN_PASSWORD`
2. Recreate admin user:
   ```bash
   node scripts/seed_admin.js
   ```

### Script Fails

**Solution:**
1. Check Docker is running: `docker ps`
2. Check logs: `docker compose logs`
3. Try manual setup:
   ```bash
   docker compose up -d
   ./scripts/migrate.sh
   node scripts/seed_admin.js
   ```

---

## Getting Help

If you're stuck:

1. **Check the logs:**
   ```bash
   docker compose logs
   ```

2. **Check troubleshooting guide:** [docs/troubleshooting.md](troubleshooting.md)

3. **Open a GitHub issue:**
   - Include what step you're on
   - Include error messages
   - Include your operating system

---

## Stopping the Application

To stop the application:

```bash
docker compose down
```

To start it again:

```bash
docker compose up -d
```

---

**Congratulations! 🎉 You've successfully set up Handmade Harmony!**

For more detailed guides, see:
- [Native Install Guide](native_install.md) - If you can't use Docker
- [Admin Quick Guide](admin_quickguide.md) - How to use the admin panel
- [Troubleshooting](troubleshooting.md) - Common issues and solutions

