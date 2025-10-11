# 🚀 Quick Start Guide

## For New Deployments

### 1. GitHub Setup (5 minutes)

```bash
# Create a new repository on GitHub: nordic-medtek-cms-api

# In this directory:
git remote add origin https://github.com/YOUR_USERNAME/nordic-medtek-cms-api.git
git push -u origin main
```

### 2. Railway Setup (10 minutes)

1. **Create Project**: Railway.app → New Project → Deploy from GitHub
2. **Add Volume**: Settings → Volumes → New Volume → Mount Path: `/data`
3. **Set Variables**: Variables tab → Add these:

```env
NODE_ENV=production
DATABASE_PATH=/data/cms.db
JWT_SECRET=<generate-random-32-char-string>
FRONTEND_URL=https://nordic-medtek.vercel.app
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=<your-secure-password>
```

4. **Generate Domain**: Settings → Generate Domain
5. **Copy URL**: Save your Railway URL

### 3. Update Frontend (2 minutes)

In Vercel (nordic-medtek project):
1. Settings → Environment Variables
2. Add: `VITE_CMS_API_URL=https://your-railway-url.railway.app`
3. Redeploy frontend

### 4. Test & Login

1. Visit: `https://your-railway-url.railway.app/api/health`
2. Should see: `{"status":"OK",...}`
3. Go to: `https://nordic-medtek.vercel.app/admin`
4. Login with your credentials

## ✅ Done!

Your CMS is now running as a standalone backend on Railway.

---

## For Local Development

```bash
# Install dependencies
npm install

# Copy environment template
# Create .env file manually with your settings

# Start server
npm start

# Server runs at http://localhost:3001
```

---

## Common URLs

- **Health Check**: `https://your-url/api/health`
- **Products API**: `https://your-url/api/products`
- **Login**: `https://your-url/api/auth/login`
- **Admin Panel**: `https://nordic-medtek.vercel.app/admin`

---

## Need Help?

See `DEPLOYMENT_GUIDE.md` for detailed instructions and troubleshooting.

