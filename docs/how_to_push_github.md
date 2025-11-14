# How to Push Code to GitHub

This guide shows you how to upload your Handmade Harmony project to GitHub.

---

## Method 1: Using GitHub Desktop (Easiest for Non-Coders)

### Step 1: Install GitHub Desktop

1. **Go to:** https://desktop.github.com/
2. **Download GitHub Desktop** for your operating system
3. **Install it** (double-click the installer)
4. **Sign in** with your GitHub account (or create one at github.com)

### Step 2: Add Your Project

1. **Open GitHub Desktop**
2. **Click "File" > "Add Local Repository"**
3. **Browse to your miniecom folder**
4. **Click "Add Repository"**

### Step 3: Create Repository on GitHub

1. **In GitHub Desktop, click "Publish repository"**
2. **Enter repository name:** `miniecom` (or whatever you want)
3. **Choose:** Private or Public
4. **Click "Publish Repository"**
5. **Wait for upload** (this takes a few minutes)

### Step 4: Making Changes and Pushing

**Whenever you make changes:**

1. **Open GitHub Desktop**
2. **You'll see your changes listed**
3. **Write a message** describing what you changed (e.g., "Added new products")
4. **Click "Commit to main"**
5. **Click "Push origin"** to upload to GitHub

**That's it!** Your code is now on GitHub.

---

## Method 2: Using Command Line (For Developers)

### Step 1: Create GitHub Repository

1. **Go to:** https://github.com
2. **Click the "+" icon** (top right)
3. **Click "New repository"**
4. **Enter repository name:** `miniecom`
5. **Choose:** Private or Public
6. **Don't check** "Initialize with README" (you already have one)
7. **Click "Create repository"**

### Step 2: Initialize Git (If Not Already Done)

**Open Terminal in your project folder:**

```bash
# Check if git is initialized
ls -la .git

# If not, initialize:
git init
```

### Step 3: Add Remote

**Copy the repository URL from GitHub** (looks like: `https://github.com/yourusername/miniecom.git`)

```bash
# Add remote
git remote add origin https://github.com/yourusername/miniecom.git

# Verify
git remote -v
```

### Step 4: Add and Commit Files

```bash
# Add all files
git add .

# Commit with message
git commit -m "Initial commit: Handmade Harmony e-commerce platform"
```

### Step 5: Push to GitHub

```bash
# Push to GitHub
git push -u origin main
```

**If asked for credentials:**
- **Username:** Your GitHub username
- **Password:** Use a Personal Access Token (not your GitHub password)
  - Create token: GitHub > Settings > Developer settings > Personal access tokens > Generate new token
  - Give it "repo" permissions

### Step 6: Future Updates

**Whenever you make changes:**

```bash
# See what changed
git status

# Add changed files
git add .

# Commit
git commit -m "Description of changes"

# Push to GitHub
git push
```

---

## Method 3: Using the Setup Script

**We have a helper script!**

```bash
# Run the setup script
./scripts/setup_github.sh
```

**This script will:**
1. Check if Git is initialized
2. Generate SSH key (if needed)
3. Ask for your GitHub repository URL
4. Add remote
5. Help you push

**Follow the prompts!**

---

## Enabling GitHub Actions (CI/CD)

### What are GitHub Actions?

GitHub Actions automatically test and deploy your code when you push changes.

### Step 1: Check Workflow File Exists

```bash
ls -la .github/workflows/ci.yml
```

If it exists, you're good! If not, see Part D.1 documentation.

### Step 2: Add Secrets (For Deployment)

**If you want automatic deployment:**

1. **Go to your GitHub repository**
2. **Click "Settings"**
3. **Click "Secrets and variables" > "Actions"**
4. **Click "New repository secret"**
5. **Add these secrets:**

   - **Name:** `SSH_PRIVATE_KEY`
   - **Value:** Your server's SSH private key

   - **Name:** `HOST`
   - **Value:** Your server IP or domain

   - **Name:** `SSH_USER`
   - **Value:** Your SSH username (usually `root` or `ubuntu`)

   - **Name:** `DOCKER_USERNAME` (optional)
   - **Value:** Your Docker Hub username

   - **Name:** `DOCKER_PASSWORD` (optional)
   - **Value:** Your Docker Hub password/token

### Step 3: Test GitHub Actions

1. **Make a small change** (edit README.md)
2. **Commit and push:**
   ```bash
   git add README.md
   git commit -m "Test GitHub Actions"
   git push
   ```
3. **Go to GitHub repository**
4. **Click "Actions" tab**
5. **You should see a workflow running!**

---

## Protecting Sensitive Information

### ⚠️ IMPORTANT: Don't Push Secrets!

**Never commit these files:**
- `.env` (contains passwords and secrets)
- `*.pem` (private keys)
- `*.key` (private keys)
- Any file with passwords

### Check .gitignore

**Make sure `.gitignore` includes:**
```
.env
*.log
node_modules/
storage/uploads/
storage/backups/
```

### If You Accidentally Pushed Secrets

1. **Remove from Git history:**
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   ```

2. **Force push:**
   ```bash
   git push origin --force --all
   ```

3. **Change all secrets immediately!**
   - Change all passwords
   - Regenerate API keys
   - Rotate JWT secrets

---

## Branching (Advanced)

### Create a Branch

```bash
# Create and switch to new branch
git checkout -b feature/new-feature

# Make changes, then:
git add .
git commit -m "Added new feature"
git push -u origin feature/new-feature
```

### Create Pull Request

1. **Go to GitHub repository**
2. **You'll see a banner:** "Compare & pull request"
3. **Click it**
4. **Write description of changes**
5. **Click "Create pull request"**
6. **Review and merge** (if you're the owner)

---

## Troubleshooting

### "Permission denied (publickey)"

**Solution:** Set up SSH keys:
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# Add to GitHub
cat ~/.ssh/id_ed25519.pub
# Copy output and add to GitHub > Settings > SSH and GPG keys
```

### "Repository not found"

**Solution:**
- Check repository URL is correct
- Check you have access to the repository
- Check you're signed in to GitHub

### "Everything up-to-date" but changes not showing

**Solution:**
```bash
# Check status
git status

# Make sure you committed
git log --oneline -5

# Force push (if needed)
git push --force
```

---

## Quick Reference

```bash
# Check status
git status

# Add files
git add .

# Commit
git commit -m "Your message"

# Push
git push

# Pull latest
git pull

# See history
git log --oneline

# Create branch
git checkout -b branch-name
```

---

**That's it!** Your code is now on GitHub and you can collaborate with others or deploy automatically.

For more Git help, see: https://git-scm.com/doc

