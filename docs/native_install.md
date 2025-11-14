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

```bash
git clone https://github.com/yourusername/miniecom.git
cd miniecom
```

Or download as ZIP and extract.

### Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and update:
- `MONGO_URI` - Change to: `mongodb://localhost:27017/miniecom`
- `JWT_SECRET` - Generate with: `openssl rand -base64 32`
- `SESSION_SECRET` - Generate with: `openssl rand -base64 32`
- `CSRF_SECRET` - Generate with: `openssl rand -base64 32`
- `ADMIN_EMAIL` - Your admin email
- `ADMIN_PASSWORD` - Your admin password

### Step 3: Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

### Step 4: Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### Step 5: Build Backend

```bash
cd backend
npm run build
cd ..
```

### Step 6: Run Database Migrations

```bash
# Make sure MongoDB is running
# Ubuntu: sudo systemctl status mongod
# Windows: Check Services > MongoDB
# macOS: brew services list

# Run migrations
cd backend
node -e "
const { MongoClient } = require('mongodb');
require('dotenv').config();
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/miniecom';
(async () => {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  // Run migrations from migrations/ directory
  const fs = require('fs');
  const path = require('path');
  const migrations = fs.readdirSync('./migrations').sort();
  for (const file of migrations) {
    if (file.endsWith('.js')) {
      console.log('Running migration:', file);
      const migration = require(path.join('./migrations', file));
      if (migration.up) await migration.up(db, client);
    }
  }
  await client.close();
})();
"
cd ..
```

Or use the migrate script:
```bash
# If you have mongosh installed
mongosh "$MONGO_URI" --eval "db.createCollection('migrations')"
# Then run migration files manually
```

### Step 7: Seed Admin User

```bash
node scripts/seed_admin.js
```

### Step 8: Seed Sample Data (Optional)

```bash
node backend/scripts/seed_sample_data.js
```

### Step 9: Start Backend Server

**Development mode (with auto-reload):**
```bash
cd backend
npm run dev
```

**Production mode:**
```bash
cd backend
npm start
```

The backend will run on http://localhost:3000

### Step 10: Start Frontend Server

**Open a new terminal window:**

**Development mode:**
```bash
cd frontend
npm run dev
```

**Production mode (build first):**
```bash
cd frontend
npm run build
npm run preview  # Or serve with nginx/apache
```

The frontend will run on http://localhost:5173 (Vite default) or http://localhost:3000

---

## Configuration for Native Install

### Update .env for Native Install

```bash
# MongoDB (local instance)
MONGO_URI=mongodb://localhost:27017/miniecom

# Application URLs
APP_URL=http://localhost:5173  # Frontend dev server
API_URL=http://localhost:3000  # Backend server

# File uploads (relative to backend directory)
UPLOAD_DIR=./storage/uploads
```

### Port Configuration

**Backend:** Default port 3000 (change in `backend/src/server.ts` or via `PORT` env var)

**Frontend:** Default port 5173 for Vite dev server (change in `frontend/vite.config.ts`)

---

## Running Services

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Production Mode

**Build frontend:**
```bash
cd frontend
npm run build
```

**Start backend:**
```bash
cd backend
npm start
```

**Serve frontend (using a web server):**

**Option 1: Using serve (npm package)**
```bash
npm install -g serve
cd frontend
serve -s dist -l 80
```

**Option 2: Using nginx**
```bash
# Install nginx
sudo apt-get install nginx

# Copy frontend build
sudo cp -r frontend/dist/* /var/www/html/

# Configure nginx (see nginx/miniecom.conf for example)
```

---

## Troubleshooting

### MongoDB Connection Failed

**Check MongoDB is running:**
```bash
# Ubuntu
sudo systemctl status mongod

# Windows
# Check Services > MongoDB

# macOS
brew services list
```

**Test connection:**
```bash
mongosh mongodb://localhost:27017
```

### Port Already in Use

**Find process using port:**
```bash
# Linux/macOS
sudo lsof -i :3000
sudo lsof -i :5173

# Windows
netstat -ano | findstr :3000
```

**Kill process or change port:**
- Backend: Set `PORT=3001` in `.env`
- Frontend: Edit `frontend/vite.config.ts`

### Module Not Found Errors

**Reinstall dependencies:**
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

