# 🚀 Complete Deployment Guide

## Quick Start Checklist

- [ ] Push code to GitHub
- [ ] Create Railway project
- [ ] Configure Railway volume
- [ ] Set environment variables
- [ ] Deploy and verify
- [ ] Update frontend API URL

---

## Step 1: Push to GitHub

### Create a New Repository

1. Go to [GitHub](https://github.com) and create a new repository
   - Name: `nordic-medtek-cms-api`
   - Visibility: Private (recommended)
   - **Don't** initialize with README (we already have one)

### Push Your Code

```bash
cd "E:\Mikal\Nordic Medical Technologies\nordic-medtek-cms"

# Add all files
git add .

# Commit
git commit -m "Initial commit: Nordic MedTek CMS API"

# Add remote (replace with your GitHub repo URL)
git remote add origin https://github.com/YOUR_USERNAME/nordic-medtek-cms-api.git

# Push
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy to Railway

### Create Railway Project

1. Go to [Railway.app](https://railway.app)
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Choose `nordic-medtek-cms-api`
5. Wait for initial deployment (it will fail, that's expected)

---

## Step 3: Configure Railway Volume

**IMPORTANT**: This stores your database persistently

1. In Railway dashboard, click on your service
2. Go to **Settings** tab
3. Scroll to **Volumes** section
4. Click **New Volume**
5. Set **Mount Path**: `/data`
6. Click **Add**

---

## Step 4: Set Environment Variables

In Railway dashboard:

1. Click on your service
2. Go to **Variables** tab
3. Click **New Variable** and add these:

### Required Variables

```env
NODE_ENV=production
PORT=3001
DATABASE_PATH=/data/cms.db
JWT_SECRET=<generate-strong-random-secret>
FRONTEND_URL=https://nordic-medtek.vercel.app
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@nordicmedtek.com
DEFAULT_ADMIN_PASSWORD=<choose-strong-password>
BCRYPT_ROUNDS=10
MAX_FILE_SIZE=10485760
```

### Generate JWT Secret

Use a strong random string. Generate one online or use:

**PowerShell:**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

**Or use:** `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Important Notes

⚠️ **Never use the default passwords in production!**

✅ Save these credentials securely - you'll need them to log into the admin panel

---

## Step 5: Deploy & Verify

### Trigger Deployment

1. Railway should auto-deploy after adding environment variables
2. If not, click **Deploy** button manually
3. Wait for deployment to complete (watch the logs)

### Get Your API URL

1. In Railway dashboard, go to **Settings** tab
2. Under **Domains**, click **Generate Domain**
3. Copy the generated URL (e.g., `https://nordic-medtek-cms-production.up.railway.app`)

### Test Your Deployment

Open these URLs in your browser:

1. **Health Check**:
   ```
   https://your-railway-url.railway.app/api/health
   ```
   Should return: `{"status":"OK",...}`

2. **Test Volume**:
   ```
   https://your-railway-url.railway.app/api/test
   ```
   Should show database path and existence

3. **Products API**:
   ```
   https://your-railway-url.railway.app/api/products
   ```
   Should return empty products array initially

---

## Step 6: Update Frontend Configuration

### Update Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `nordic-medtek` project
3. Go to **Settings** > **Environment Variables**
4. Add or update:

```env
VITE_CMS_API_URL=https://your-railway-url.railway.app
```

5. Click **Save**
6. Redeploy your frontend

### Test Frontend Integration

1. Go to `https://nordic-medtek.vercel.app/admin`
2. Log in with your admin credentials
3. Try creating/editing products
4. Verify CORS is working (no errors in console)

---

## Step 7: Initial Login & Setup

### First Login

1. Go to: `https://nordic-medtek.vercel.app/admin`
2. Username: The `DEFAULT_ADMIN_USERNAME` you set
3. Password: The `DEFAULT_ADMIN_PASSWORD` you set

### Change Admin Password

⚠️ **Immediately** change your password after first login!

(This requires implementing a password change endpoint - add to backlog)

---

## 🔍 Troubleshooting

### Railway Deployment Failed

Check Railway logs for errors. Common issues:

1. **Module not found**: Run `npm install` locally and commit `package-lock.json`
2. **Database errors**: Verify `DATABASE_PATH=/data/cms.db` is set
3. **Port binding**: Ensure `PORT` variable is set or remove it (Railway sets automatically)

### CORS Errors

1. Verify `FRONTEND_URL` is exactly: `https://nordic-medtek.vercel.app`
2. No trailing slash!
3. Check Railway logs for CORS blocked messages
4. Ensure frontend is using correct API URL

### Database Not Persisting

1. Verify volume is mounted at `/data`
2. Check `DATABASE_PATH=/data/cms.db`
3. Visit `/api/test` endpoint to verify database path

### Can't Login

1. Check admin credentials in Railway variables
2. Verify database was created (check logs for initialization messages)
3. Try creating new user via database migration

---

## 📊 Monitoring

### Railway Logs

View real-time logs in Railway dashboard:
- Click on your service
- Go to **Deployments** tab
- Click latest deployment
- View logs

### Important Log Messages

✅ **Good:**
```
✅ Database initialized successfully
✅ Migrations completed
🚀 NordicMedTek CMS API Server
📡 Listening on port 3001
```

❌ **Problems:**
```
❌ Failed to start server
Error: ENOENT: no such file or directory
CORS blocked origin: ...
```

---

## 🔄 Future Updates

### Deploy Code Changes

1. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your update description"
   git push
   ```

2. Railway automatically deploys on push
3. Monitor deployment in Railway dashboard

### Database Migrations

Migrations run automatically on startup. To add new migrations:

1. Edit `database/migrate.js`
2. Add migration logic
3. Commit and push
4. Railway will run migrations on next deployment

---

## 📞 Support Commands

### View Database

```bash
# SSH into Railway container (if enabled)
railway ssh

# Check database
sqlite3 /data/cms.db
.tables
SELECT * FROM products;
.exit
```

### Manual Migration

```bash
railway run npm run migrate
```

---

## ✅ Deployment Complete!

Your CMS API is now:
- ✅ Running on Railway
- ✅ Using persistent volume for database
- ✅ Protected with JWT authentication
- ✅ Connected to your Vercel frontend
- ✅ CORS configured properly

Test everything thoroughly and monitor the logs for the first few hours.

---

**Need Help?**
- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway

