# 🚀 NordicMedTek CMS - IT Plays Deployment Guide

## Overview

This guide will help you deploy your NordicMedTek CMS API on IT Plays VPS hosting alongside your React frontend.

## Prerequisites

- IT Plays VPS with Node.js support
- SSH access to your server
- FileZilla or similar FTP client
- Basic command line knowledge

## Step 1: Prepare Your CMS Files

### Files to Upload:
```
nordic-medtek-cms/
├── server.js
├── package.json
├── package-lock.json
├── env.production
├── ecosystem.config.js
├── deploy-itplays.sh
├── routes/
├── database/
├── middleware/
├── uploads/
└── node_modules/ (will be installed on server)
```

## Step 2: Upload to IT Plays Server

### Via FileZilla:
1. Connect to your IT Plays server
2. Navigate to your domain directory (e.g., `/home/yourdomain/public_html/`)
3. Create a new folder: `cms-api`
4. Upload all CMS files to the `cms-api` folder

### Via SSH (Recommended):
```bash
# Connect to your server
ssh your-username@your-server-ip

# Navigate to your domain directory
cd /home/yourdomain/public_html/

# Create CMS directory
mkdir cms-api
cd cms-api

# Upload files (you can use scp or rsync)
```

## Step 3: Server Setup

### Install Node.js (if not already installed):
```bash
# Update system
sudo apt update

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2
```

### Install Dependencies:
```bash
cd /home/yourdomain/public_html/cms-api
npm install --production
```

## Step 4: Configure Environment

### Edit Environment File:
```bash
nano env.production
```

Update these values:
```env
NODE_ENV=production
PORT=3001
DATABASE_PATH=./database/cms.db
JWT_SECRET=your-strong-jwt-secret-here
FRONTEND_URL=https://www.nordicmedtek.no
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@nordicmedtek.no
DEFAULT_ADMIN_PASSWORD=your-secure-password-here
BCRYPT_ROUNDS=10
MAX_FILE_SIZE=10485760
```

### Copy to .env:
```bash
cp env.production .env
```

## Step 5: Database Setup

### Create Database:
```bash
# Create database directory
mkdir -p database

# Run migrations
npm run migrate
```

## Step 6: Start the CMS

### Using PM2 (Recommended):
```bash
# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Alternative - Direct Start:
```bash
# Start directly (not recommended for production)
node server.js
```

## Step 7: Configure Reverse Proxy (Optional)

If you want to access your CMS via a subdomain like `api.nordicmedtek.no`:

### Install Nginx (if not installed):
```bash
sudo apt install nginx
```

### Create Nginx Configuration:
```bash
sudo nano /etc/nginx/sites-available/cms-api
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name api.nordicmedtek.no;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Enable the Site:
```bash
sudo ln -s /etc/nginx/sites-available/cms-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 8: Update Frontend Configuration

### Update your React app to use the CMS API:
```javascript
// In your React app, update the API URL
const API_URL = 'https://api.nordicmedtek.no'; // or http://your-server-ip:3001
```

## Step 9: Test Your Deployment

### Test Endpoints:
1. **Health Check**: `https://api.nordicmedtek.no/api/health`
2. **Products API**: `https://api.nordicmedtek.no/api/products`
3. **Admin Login**: `https://api.nordicmedtek.no/api/auth/login`

### Test from Frontend:
1. Go to `https://www.nordicmedtek.no/admin`
2. Log in with your admin credentials
3. Try creating/editing products

## Step 10: Monitoring & Maintenance

### Check PM2 Status:
```bash
pm2 status
pm2 logs nordic-medtek-cms
```

### Restart CMS:
```bash
pm2 restart nordic-medtek-cms
```

### Update CMS:
```bash
# Pull latest changes
git pull

# Install new dependencies
npm install --production

# Restart application
pm2 restart nordic-medtek-cms
```

## Troubleshooting

### Common Issues:

1. **Port 3001 not accessible**:
   - Check firewall settings
   - Ensure port is open in IT Plays control panel

2. **Database errors**:
   - Check database permissions
   - Verify DATABASE_PATH in .env

3. **CORS errors**:
   - Verify FRONTEND_URL in .env
   - Check server logs for CORS messages

4. **File upload issues**:
   - Check uploads directory permissions
   - Verify MAX_FILE_SIZE setting

### Logs:
```bash
# View PM2 logs
pm2 logs nordic-medtek-cms

# View system logs
sudo journalctl -u nginx
```

## Security Considerations

1. **Change default admin password** immediately
2. **Use strong JWT secret**
3. **Enable HTTPS** for production
4. **Regular backups** of database
5. **Keep Node.js updated**

## Backup Strategy

### Database Backup:
```bash
# Create backup
cp database/cms.db database/cms-backup-$(date +%Y%m%d).db

# Schedule daily backups
crontab -e
# Add: 0 2 * * * cp /home/yourdomain/public_html/cms-api/database/cms.db /home/yourdomain/backups/cms-backup-$(date +\%Y\%m\%d).db
```

## Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs nordic-medtek-cms`
2. Verify environment variables
3. Check file permissions
4. Contact IT Plays support for server-related issues

---

**Your CMS is now running on IT Plays!** 🎉

The API will be available at:
- Direct access: `http://your-server-ip:3001`
- Subdomain (if configured): `https://api.nordicmedtek.no`
