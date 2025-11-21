# Native Installation Guide (Without Docker)

This guide explains how to install and run Handmade Harmony without Docker. This is useful if:
- You cannot install Docker on your system
- You prefer to run services natively
- You're developing and want direct access to services

---

## Prerequisites

### Ubuntu 20.04+ / Debian

**Install Node.js 18+ and npm:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Verify installation:**
```bash
node --version  # Should show v18.x or higher
npm --version    # Should show 9.x or higher
```

**Install MongoDB 7:**
```bash
# Import MongoDB public GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update and install
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

**Verify MongoDB:**
```bash
mongosh --eval "db.adminCommand('ping')"
```

### Windows 10/11

**Install Node.js:**
1. Go to https://nodejs.org/
2. Download the LTS version (18.x or higher)
3. Run the installer and follow the prompts
4. Restart your computer

**Install MongoDB:**
1. Go to https://www.mongodb.com/try/download/community
2. Download MongoDB Community Server for Windows
3. Run the installer
4. Choose "Complete" installation
5. Install MongoDB as a Windows Service (recommended)

**Verify installation:**
Open Command Prompt or PowerShell:
```powershell
node --version
npm --version
mongod --version
```

### macOS

**Install Node.js:**
```bash
# Using Homebrew
brew install node@18

# Or download from https://nodejs.org/
```

**Install MongoDB:**
```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community@7.0

# Start MongoDB
brew services start mongodb-community@7.0
```

**Verify installation:**
```bash
node --version
npm --version
mongosh --version
```

---

## Installation Steps

### Step 1: Clone or Download the Project

**On Windows (PowerShell):**
```powershell
git clone https://github.com/yourusername/miniecom.git
cd miniecom
```

**On Mac/Linux:**
```bash
git clone https://github.com/yourusername/miniecom.git
cd miniecom
```

Or download as ZIP and extract.

### Step 2: Configure Environment

**On Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**On Mac/Linux:**
```bash
cp .env.example .env
```

Edit `.env` and update:
- `MONGO_URI` - Change to: `mongodb://localhost:27017/miniecom`
- `JWT_SECRET` - Generate with:
  - **Windows (PowerShell):** `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))`
  - **Mac/Linux:** `openssl rand -base64 32`
- `SESSION_SECRET` - Generate with:
  - **Windows (PowerShell):** `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))`
  - **Mac/Linux:** `openssl rand -base64 32`
- `CSRF_SECRET` - Generate with:
  - **Windows (PowerShell):** `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))`
  - **Mac/Linux:** `openssl rand -base64 32`
- `ADMIN_EMAIL` - Your admin email
- `ADMIN_PASSWORD` - Your admin password

### Step 3: Install Backend Dependencies

**On Windows (PowerShell) or Mac/Linux:**
```powershell
# Same commands work on all platforms
cd backend
npm install
cd ..
```

### Step 4: Install Frontend Dependencies

**On Windows (PowerShell) or Mac/Linux:**
```powershell
# Same commands work on all platforms
cd frontend
npm install
cd ..
```

### Step 5: Build Backend

**On Windows (PowerShell) or Mac/Linux:**
```powershell
# Same commands work on all platforms
cd backend
npm run build
cd ..
```

### Step 6: Run Database Migrations

**Make sure MongoDB is running:**

**On Windows:**
- Open Services (Win+R, type `services.msc`)
- Find "MongoDB" service and start it
- OR use PowerShell (as Administrator): `Start-Service MongoDB`

**On Ubuntu:**
```bash
sudo systemctl status mongod
sudo systemctl start mongod
```

**On macOS:**
```bash
brew services list
brew services start mongodb-community@7.0
```

**Run migrations:**

**On Mac/Linux:**
```bash
# Make sure you're in the project root directory
./scripts/migrate.sh
```

**On Windows (PowerShell):**
```powershell
# Using Git Bash (if installed):
bash scripts/migrate.sh

# OR using WSL:
wsl bash scripts/migrate.sh

# OR directly with Node.js (if you have a migration runner):
# Check backend/migrations/ directory for migration files
```

**Note:** The migrate script requires `mongosh` (MongoDB shell) to be installed. If you don't have it:

**Ubuntu/Debian:**
```bash
sudo apt-get install -y mongodb-mongosh
```

**macOS:**
```bash
brew install mongosh
```

**Windows:**
1. Download MongoDB Shell from: https://www.mongodb.com/try/download/shell
2. Install it and add to PATH
3. OR use the MongoDB installation that includes mongosh

### Step 7: Seed Admin User

**On Windows (PowerShell) or Mac/Linux:**
```powershell
# Same command works on all platforms
node scripts/seed_admin.js
```

### Step 8: Seed Sample Data (Optional)

**On Windows (PowerShell) or Mac/Linux:**
```powershell
# Same command works on all platforms
node backend/scripts/seed_sample_data.js
```

### Step 9: Start Backend Server

**Development mode (with auto-reload):**

**On Windows (PowerShell) or Mac/Linux:**
```powershell
# Same commands work on all platforms
cd backend
npm run dev
```

**Production mode:**

**On Windows (PowerShell) or Mac/Linux:**
```powershell
# Same commands work on all platforms
cd backend
npm start
```

The backend will run on http://localhost:3000

### Step 10: Start Frontend Server

**Open a new terminal window:**

**Development mode:**

**On Windows (PowerShell) or Mac/Linux:**
```powershell
# Same commands work on all platforms
cd frontend
npm run dev
```

**Production mode (build first):**

**On Windows (PowerShell) or Mac/Linux:**
```powershell
# Same commands work on all platforms
cd frontend
npm run build
npm run preview  # Or serve with nginx/apache
```

The frontend will run on http://localhost:5173 (Vite default port)

---

## Configuration for Native Install

### Update .env for Native Install

```bash
# MongoDB (local instance)
MONGO_URI=mongodb://localhost:27017/miniecom

# Application URLs
APP_URL=http://localhost:5173  # Frontend dev server
API_URL=http://localhost:3001  # Backend server

# File uploads (relative to backend directory)
UPLOAD_DIR=./storage/uploads
```

### Port Configuration

**Backend:** Default port 3001 (change in `backend/src/config/Config.ts` or via `PORT` env var)

**Frontend:** Default port 5173 for Vite dev server (change in `frontend/vite.config.ts`)

---

## Running Services

### Development Mode

**Terminal 1 - Backend:**

**On Windows (PowerShell) or Mac/Linux:**
```powershell
# Same commands work on all platforms
cd backend
npm run dev
```

**Terminal 2 - Frontend:**

**On Windows (PowerShell) or Mac/Linux:**
```powershell
# Same commands work on all platforms
cd frontend
npm run dev
```

### Production Mode

**Build frontend:**

**On Windows (PowerShell) or Mac/Linux:**
```powershell
# Same commands work on all platforms
cd frontend
npm run build
```

**Start backend:**

**On Windows (PowerShell) or Mac/Linux:**
```powershell
# Same commands work on all platforms
cd backend
npm start
```

**Serve frontend (using a web server):**

**Option 1: Using serve (npm package)**

**On Windows (PowerShell) or Mac/Linux:**
```powershell
# Same commands work on all platforms
npm install -g serve
cd frontend
serve -s dist -l 80
```

**Option 2: Using nginx (Linux/Mac only)**

**On Linux:**
```bash
# Install nginx
sudo apt-get install nginx

# Copy frontend build
sudo cp -r frontend/dist/* /var/www/html/

# Configure nginx (see nginx/miniecom.conf for example)
```

**On Windows:**
- Install nginx for Windows from: http://nginx.org/en/download.html
- Copy `frontend/dist/*` to nginx html directory
- Configure nginx (see nginx/miniecom.conf for example)

---

## Troubleshooting

### MongoDB Connection Failed

**Check MongoDB is running:**

**On Windows:**
- Open Services (Win+R, type `services.msc`)
- Find "MongoDB" service and check if it's running
- OR use PowerShell: `Get-Service MongoDB`

**On Ubuntu:**
```bash
sudo systemctl status mongod
```

**On macOS:**
```bash
brew services list
```

**Test connection:**

**On Windows (PowerShell) or Mac/Linux:**
```powershell
# Same command works on all platforms
mongosh mongodb://localhost:27017
```

### Port Already in Use

**Find process using port:**

**On Windows (PowerShell):**
```powershell
netstat -ano | findstr :3000
netstat -ano | findstr :5173
# Kill process (replace PID with the number from above)
taskkill /PID <PID> /F
```

**On Linux/macOS:**
```bash
sudo lsof -i :3000
sudo lsof -i :5173
# Kill process
kill -9 <PID>
```

**Kill process or change port:**
- Backend: Set `PORT=3001` in `.env`
- Frontend: Edit `frontend/vite.config.ts`

### Module Not Found Errors

**Reinstall dependencies:**

**On Windows (PowerShell):**
```powershell
cd backend
Remove-Item -Recurse -Force node_modules, package-lock.json -ErrorAction SilentlyContinue
npm install

cd ../frontend
Remove-Item -Recurse -Force node_modules, package-lock.json -ErrorAction SilentlyContinue
npm install
```

**On Mac/Linux:**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install

cd ../frontend
rm -rf node_modules package-lock.json
npm install
```

### Permission Errors

**Storage/uploads directory:**

**On Windows (PowerShell):**
```powershell
# Create directory if it doesn't exist
New-Item -ItemType Directory -Force -Path backend/storage/uploads

# Grant permissions (run as Administrator if needed)
icacls backend/storage /grant Users:F /T
```

**On Mac/Linux:**
```bash
mkdir -p backend/storage/uploads
chmod -R 775 backend/storage
```

---

## Differences from Docker Setup

1. **MongoDB:** Runs as a system service instead of container
2. **Ports:** May need to configure firewall rules
3. **File Paths:** Use relative paths from project root
4. **Logs:** Check `backend/storage/logs/` instead of Docker logs
5. **Updates:** Update Node.js and MongoDB separately

---

## Next Steps

Once running natively:
- See [docs/admin_quickguide.md](admin_quickguide.md) for admin tasks
- See [docs/developer_guide.md](developer_guide.md) for development
- See [docs/troubleshooting.md](troubleshooting.md) for issues

---

**Note:** For production deployments, Docker is still recommended for easier management and isolation.

