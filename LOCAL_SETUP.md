# 💻 Local Development Setup

## Quick Setup

### 1. Install Dependencies

```bash
cd "E:\Mikal\Nordic Medical Technologies\nordic-medtek-cms"
npm install
```

This will install all required packages (Express, SQLite, etc.)

### 2. Environment Configuration

The `.env` file is already created with development settings:

```env
PORT=3001
NODE_ENV=development
DATABASE_PATH=./database/cms.db
JWT_SECRET=nordic-medtek-dev-secret-key-2024
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123
FRONTEND_URL=http://localhost:5173
```

### 3. Start the Server

```bash
npm start
```

Or for development:

```bash
npm run dev
```

### 4. Test the API

Open your browser or use curl:

**Health Check:**
```
http://localhost:3001/api/health
```

**Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"admin\", \"password\": \"admin123\"}"
```

**Get Products:**
```
http://localhost:3001/api/products
```

## 🔧 Development Commands

```bash
# Start server
npm start

# Run migrations manually
npm run migrate
```

## 📁 Database

The SQLite database will be created at:
```
./database/cms.db
```

On first startup, the server will:
1. Create the database
2. Run schema
3. Create default admin user
4. Run all migrations

## 🌐 Testing with Frontend

If you want to test with the frontend locally:

1. **Start CMS Backend** (this project):
   ```bash
   npm start
   # Runs on http://localhost:3001
   ```

2. **Start Frontend** (in nordic-medtek folder):
   ```bash
   cd ../nordic-medtek
   npm run dev
   # Runs on http://localhost:5173
   ```

3. **Update Frontend Config**:
   Make sure the frontend `.env` has:
   ```env
   VITE_CMS_API_URL=http://localhost:3001
   ```

4. **Access Admin**:
   ```
   http://localhost:5173/admin
   ```

## ⚠️ Troubleshooting

### Port Already in Use

If port 3001 is already in use, change it in `.env`:
```env
PORT=3002
```

### Module Not Found Errors

Run:
```bash
npm install
```

### Database Locked

Close any database browser tools that might have the database open.

### CORS Errors

Make sure `FRONTEND_URL` in `.env` matches where your frontend is running.

## ✅ You're Ready!

Once you see these messages in console:
```
✅ Database initialized successfully
✅ Migrations completed
🚀 NordicMedTek CMS API Server
📡 Listening on port 3001
```

Your CMS API is ready for local development!

