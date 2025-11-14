#!/bin/bash

# GitHub Setup Script
# Helps set up Git repository and connect to GitHub

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Check if .git exists
if [ ! -d "$PROJECT_ROOT/.git" ]; then
    log "Initializing Git repository..."
    cd "$PROJECT_ROOT"
    git init
    git branch -M main
fi

# Check for existing remote
if git remote get-url origin &>/dev/null; then
    log "Git remote 'origin' already exists: $(git remote get-url origin)"
    read -p "Do you want to update it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Keeping existing remote"
        exit 0
    fi
fi

# Generate SSH key if it doesn't exist
SSH_KEY="$HOME/.ssh/id_rsa"
if [ ! -f "$SSH_KEY" ]; then
    log "SSH key not found. Generating new SSH key..."
    read -p "Enter your email for SSH key: " EMAIL
    ssh-keygen -t rsa -b 4096 -C "$EMAIL" -f "$SSH_KEY" -N ""
    log "SSH key generated: $SSH_KEY"
    log "Public key:"
    cat "${SSH_KEY}.pub"
    log ""
    log "Please add this public key to your GitHub account:"
    log "1. Go to https://github.com/settings/keys"
    log "2. Click 'New SSH key'"
    log "3. Paste the public key above"
    read -p "Press Enter after adding the key to GitHub..."
fi

# Get GitHub repository URL
read -p "Enter GitHub repository URL (e.g., git@github.com:username/miniecom.git): " REPO_URL

if [ -z "$REPO_URL" ]; then
    log "No repository URL provided. Exiting."
    exit 1
fi

# Add or update remote
if git remote get-url origin &>/dev/null; then
    git remote set-url origin "$REPO_URL"
    log "Updated remote 'origin' to: $REPO_URL"
else
    git remote add origin "$REPO_URL"
    log "Added remote 'origin': $REPO_URL"
fi

# Test connection
log "Testing SSH connection to GitHub..."
if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
    log "✓ SSH connection to GitHub successful"
else
    log "⚠ SSH connection test inconclusive (this is normal)"
fi

# Create .gitignore if it doesn't exist
if [ ! -f "$PROJECT_ROOT/.gitignore" ]; then
    log "Creating .gitignore file..."
    cat > "$PROJECT_ROOT/.gitignore" << 'EOF'
# Dependencies
node_modules/
package-lock.json
yarn.lock

# Environment
.env
.env.local
.env.*.local

# Build outputs
dist/
build/
*.log

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Docker
*.tar

# Storage
storage/logs/*.log
storage/uploads/*
!storage/uploads/.gitkeep

# Test coverage
coverage/
.nyc_output/
EOF
    log ".gitignore created"
fi

# Initial commit prompt
if [ -z "$(git status --porcelain)" ]; then
    log "Working directory is clean"
else
    log "Uncommitted changes detected"
    read -p "Do you want to make an initial commit? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        git commit -m "Initial commit: MiniEcom project setup"
        log "Initial commit created"
    fi
fi

# Push prompt
if git rev-parse --verify main &>/dev/null; then
    read -p "Do you want to push to GitHub? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git push -u origin main || log "Push failed. You may need to pull first or set upstream."
    fi
fi

log "GitHub setup completed!"
log "Repository: $REPO_URL"

