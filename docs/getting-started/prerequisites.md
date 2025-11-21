# Prerequisites

Before installing Handmade Harmony, ensure your system meets the following requirements.

## 📋 Table of Contents

- [For Non-Technical Users](#for-non-technical-users)
- [For Developers](#for-developers)
- [System Requirements](#system-requirements)
- [Software Requirements](#software-requirements)
- [Installation Instructions](#installation-instructions)

---

## For Non-Technical Users

If you're not familiar with technical terms, here's what you need in simple language:

### Required

1. **A Computer** running:
   - Windows 10 or newer
   - macOS 10.15 (Catalina) or newer
   - Ubuntu 20.04 or newer

2. **Docker Desktop** - A tool that runs applications in containers
   - Download from [docker.com](https://www.docker.com/products/docker-desktop)
   - It's free for personal use
   - Requires about 4 GB of RAM

3. **Internet Connection** - To download files and dependencies

### Optional (For Advanced Features)

- **Razorpay Account** - To accept online payments ([razorpay.com](https://razorpay.com))
- **Delhivery Account** - For shipping integration ([delhivery.com](https://delhivery.com))
- **Gmail Account** - To send emails to customers
- **Google Cloud Account** - For AI features ([console.cloud.google.com](https://console.cloud.google.com))

---

## For Developers

### Required Software

#### Docker Method (Recommended)

- **Docker Engine** 20.10 or higher
- **Docker Compose** 2.0 or higher
- **Git** (for cloning repository)

#### Native Installation Method

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **MongoDB** 7.x or higher
- **Git**

### Optional Tools

- **Visual Studio Code** - Recommended code editor
- **MongoDB Compass** - GUI for MongoDB
- **Postman** - API testing
- **ngrok** - For testing webhooks locally

---

## System Requirements

### Minimum Requirements (Development)

| Component | Requirement |
|-----------|-------------|
| **CPU** | 2 cores @ 2.0 GHz |
| **RAM** | 4 GB |
| **Storage** | 20 GB free space |
| **OS** | Windows 10+, macOS 10.15+, Ubuntu 20.04+ |
| **Internet** | Broadband connection |

### Recommended Requirements (Production)

| Component | Requirement |
|-----------|-------------|
| **CPU** | 4+ cores @ 2.5 GHz |
| **RAM** | 8+ GB |
| **Storage** | 50+ GB SSD |
| **OS** | Ubuntu 22.04 LTS (Server) |
| **Internet** | High-speed connection |
| **Backup** | 100+ GB for backups |

### Cloud Hosting (Production)

Recommended cloud instances:

- **AWS**: t3.medium or better
- **DigitalOcean**: Basic Droplet (4 GB RAM)
- **Azure**: Standard B2s or better
- **Google Cloud**: e2-medium or better

---

## Software Requirements

### Docker Method

#### 1. Docker Engine

**Check if installed:**
```bash
docker --version
```

**Should output:** `Docker version 20.10.x` or higher

**Installation guides:**
- [Install on Windows](https://docs.docker.com/desktop/install/windows-install/)
- [Install on Mac](https://docs.docker.com/desktop/install/mac-install/)
- [Install on Linux](https://docs.docker.com/engine/install/ubuntu/)

#### 2. Docker Compose

**Check if installed:**
```bash
docker compose version
```

**Should output:** `Docker Compose version v2.x.x` or higher

**Note:** Docker Desktop includes Docker Compose. For Linux, install separately.

#### 3. Git

**Check if installed:**
```bash
git --version
```

**Installation:**
- **Windows**: [Download Git](https://git-scm.com/download/win)
- **Mac**: `brew install git` or download from [git-scm.com](https://git-scm.com)
- **Linux**: `sudo apt install git`

### Native Installation Method

#### 1. Node.js

**Check if installed:**
```bash
node --version
```

**Should output:** `v18.x.x` or higher

**Installation:**

**Windows:**
- Download installer from [nodejs.org](https://nodejs.org)
- Run installer and follow prompts

**Mac:**
```bash
brew install node@18
```

**Linux (Ubuntu):**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 2. npm

Comes with Node.js. Verify:
```bash
npm --version
```

**Should output:** `9.x.x` or higher

#### 3. MongoDB

**Check if installed:**
```bash
mongosh --version
```

**Installation:**

**Windows:**
1. Download from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. Run installer
3. Install as Windows Service

**Mac:**
```bash
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0
```

**Linux (Ubuntu):**
```bash
# Import MongoDB public GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Create list file
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update package database
sudo apt-get update

# Install MongoDB
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

---

## Installation Instructions

### Quick Install: Docker Desktop

#### Windows

1. **Download Docker Desktop**
   - Visit: https://www.docker.com/products/docker-desktop
   - Click "Download for Windows"

2. **Install**
   - Run the downloaded `.exe` file
   - Follow installation wizard
   - Enable WSL 2 integration when prompted

3. **Start Docker Desktop**
   - Launch Docker Desktop from Start menu
   - Wait for "Docker Desktop is running" message

4. **Verify Installation**
   Open PowerShell and run:
   ```powershell
   docker --version
   docker compose version
   ```

#### macOS

1. **Download Docker Desktop**
   - Visit: https://www.docker.com/products/docker-desktop
   - Choose Apple Chip (M1/M2) or Intel Chip

2. **Install**
   - Open the `.dmg` file
   - Drag Docker to Applications folder
   - Launch Docker from Applications

3. **Start Docker**
   - Wait for Docker to start
   - Look for Docker icon in menu bar

4. **Verify Installation**
   Open Terminal and run:
   ```bash
   docker --version
   docker compose version
   ```

#### Linux (Ubuntu/Debian)

1. **Install Docker**
   ```bash
   # Install dependencies
   sudo apt-get update
   sudo apt-get install ca-certificates curl gnupg

   # Add Docker's official GPG key
   sudo install -m 0755 -d /etc/apt/keyrings
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
   sudo chmod a+r /etc/apt/keyrings/docker.gpg

   # Add Docker repository
   echo \
     "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
     $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
     sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

   # Install Docker
   sudo apt-get update
   sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
   ```

2. **Post-Installation**
   ```bash
   # Add your user to docker group
   sudo usermod -aG docker $USER
   newgrp docker

   # Enable Docker to start on boot
   sudo systemctl enable docker.service
   sudo systemctl enable containerd.service
   ```

3. **Verify Installation**
   ```bash
   docker --version
   docker compose version
   ```

---

## Network Requirements

### Required Ports

Make sure these ports are available:

| Port | Service | Used For |
|------|---------|----------|
| **80** | Frontend | Web interface |
| **3000** | Backend API | API endpoints |
| **27017** | MongoDB | Database |

### Optional Ports

| Port | Service | Used For |
|------|---------|----------|
| **8081** | Mongo Express | Database admin UI |
| **443** | HTTPS | Secure web (production) |

### Firewall Configuration

**Development (Local):**
No special configuration needed.

**Production (Server):**

**Ubuntu with UFW:**
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp  # SSH access
sudo ufw enable
```

**CentOS/RHEL with firewalld:**
```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload
```

---

## Third-Party Service Accounts

### Required for Production

None! The platform works without any third-party services.

### Optional Features

#### Payment Processing (Razorpay)

**What you need:**
- Razorpay account ([razorpay.com](https://razorpay.com))
- API Key ID and Secret
- Webhook Secret

**Cost:** Transaction fees apply (2% + GST in India)

**Setup Guide:** [Payment Setup](../features/payment/razorpay-setup.md)

#### Shipping (Delhivery)

**What you need:**
- Delhivery account ([delhivery.com](https://delhivery.com))
- API Token
- Client ID

**Cost:** Per-shipment charges

**Setup Guide:** [Shipping Setup](../features/shipping/delhivery-setup.md)

#### Email (SMTP)

**Options:**
- Gmail (free, limited)
- SendGrid (free tier available)
- Mailgun (free tier available)
- AWS SES (pay per email)

**Setup Guide:** [Email Setup](../features/email/smtp-setup.md)

#### AI Assistant (Google Gemini)

**What you need:**
- Google Cloud account
- Gemini API key (free tier available)

**Cost:** Free tier for moderate usage

**Setup Guide:** [AI Setup](../features/ai-assistant/gemini-setup.md)

---

## Verification Checklist

Before proceeding to installation, verify:

### Docker Method
- [ ] Docker Desktop installed and running
- [ ] `docker --version` works
- [ ] `docker compose version` works
- [ ] Git installed
- [ ] At least 10 GB free disk space
- [ ] Ports 80, 3000, 27017 available

### Native Method
- [ ] Node.js 18+ installed
- [ ] npm 9+ installed
- [ ] MongoDB 7+ installed and running
- [ ] Git installed
- [ ] At least 10 GB free disk space
- [ ] Ports 80, 3000, 27017 available

---

## Next Steps

Once you've met all prerequisites:

1. **Continue to Installation**
   - [Installation Guide](installation.md) - Detailed setup instructions

2. **Or use Quick Start**
   - [Quick Start](README.md) - Get running in 5 minutes

---

## Troubleshooting Prerequisites

### Docker Issues

**"Docker daemon is not running"**
- Windows/Mac: Start Docker Desktop application
- Linux: `sudo systemctl start docker`

**"permission denied while trying to connect to Docker daemon"**
```bash
sudo usermod -aG docker $USER
newgrp docker
```

**"WSL 2 installation is incomplete" (Windows)**
- Install WSL 2: Follow [Microsoft's guide](https://docs.microsoft.com/en-us/windows/wsl/install)
- Restart Docker Desktop

### Node.js/npm Issues

**"command not found: node"**
- Ensure Node.js is properly installed
- Restart terminal after installation
- Check PATH environment variable

**"npm WARN deprecated"**
- These are warnings, not errors
- Safe to ignore for most cases

### MongoDB Issues

**"Connection refused"**
- Check if MongoDB is running:
  - Windows: Check Services panel
  - Mac: `brew services list`
  - Linux: `sudo systemctl status mongod`
- Start MongoDB if stopped

**"Authorization failed"**
- Check MongoDB connection string
- Verify username and password
- Check authentication database

---

**Ready to install?** Proceed to [Installation Guide](installation.md)

