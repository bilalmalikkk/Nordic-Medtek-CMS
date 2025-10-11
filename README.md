# Nordic MedTek CMS API

Standalone backend API for Nordic Medical Technologies CMS system.

## 🚀 Features

- RESTful API for product management
- SQLite database with automatic migrations
- JWT authentication
- File upload handling (images and documents)
- CSV import functionality
- Email contact form handling
- CORS-enabled for frontend integration

## 📋 Prerequisites

- Node.js 18.x or higher
- npm or yarn

## 🛠️ Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
PORT=3001
NODE_ENV=development
DATABASE_PATH=./database/cms.db
JWT_SECRET=your-secret-key-here
FRONTEND_URL=http://localhost:5173
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=your-secure-password
```

### 3. Start the Server

```bash
npm start
```

The API will be available at `http://localhost:3001`

### 4. Test the API

Health check:
```bash
curl http://localhost:3001/api/health
```

## 🚂 Railway Deployment

### Step 1: Create Railway Project

1. Go to [Railway.app](https://railway.app)
2. Create a new project
3. Choose "Deploy from GitHub repo"
4. Select your CMS repository

### Step 2: Configure Volume

1. Go to project **Settings** > **Volumes**
2. Click **New Volume**
3. Set **Mount Path**: `/data`
4. Click **Add**

### Step 3: Set Environment Variables

Go to **Variables** tab and add:

```env
NODE_ENV=production
PORT=3001
DATABASE_PATH=/data/cms.db
JWT_SECRET=<generate-a-strong-secret>
FRONTEND_URL=https://nordic-medtek.vercel.app
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@nordicmedtek.com
DEFAULT_ADMIN_PASSWORD=<your-secure-password>
BCRYPT_ROUNDS=10
```

**Important**: 
- Use a strong, random JWT_SECRET in production
- Change the default admin password
- Set FRONTEND_URL to your Vercel deployment URL

### Step 4: Deploy

Railway will automatically deploy when you push to your repository.

### Step 5: Verify Deployment

Test the health endpoint:
```
https://your-railway-url.railway.app/api/health
```

## 📡 API Endpoints

### Public Endpoints

- `GET /api/health` - Health check
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `GET /api/categories` - Get all categories
- `POST /api/auth/login` - User login
- `POST /api/contact` - Submit contact form

### Protected Endpoints (require authentication)

- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `POST /api/categories` - Create category
- `POST /api/upload` - Upload files
- `POST /api/import/csv` - Import products from CSV

## 🔐 Authentication

The API uses JWT tokens for authentication.

### Login

```bash
curl -X POST https://your-api-url/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your-password"}'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 1, "username": "admin", "role": "admin" }
}
```

### Use Token

Include the token in subsequent requests:

```bash
curl -X GET https://your-api-url/api/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 📁 Project Structure

```
nordic-medtek-cms/
├── server.js              # Main server file
├── package.json           # Dependencies
├── railway.toml           # Railway configuration
├── .env.example           # Environment template
├── database/              # Database files
│   ├── init.js           # Database initialization
│   ├── migrate.js        # Migration scripts
│   └── schema.sql        # Database schema
├── routes/               # API routes
│   ├── auth.js          # Authentication
│   ├── products.js      # Products CRUD
│   ├── categories.js    # Categories CRUD
│   ├── upload.js        # File uploads
│   ├── import.js        # CSV import
│   └── contact.js       # Contact form
├── middleware/           # Express middleware
│   └── auth.js          # JWT authentication
└── uploads/             # File storage (on volume in production)
    ├── images/
    └── documents/
```

## 🔧 Database

The CMS uses SQLite for simplicity and portability.

### Running Migrations

Migrations run automatically on server start. To run manually:

```bash
npm run migrate
```

### Database Location

- **Development**: `./database/cms.db`
- **Production (Railway)**: `/data/cms.db` (on persistent volume)

## 🛡️ Security

- Helmet.js for security headers
- CORS configured for specific origins
- Rate limiting (200 requests per 15 minutes)
- JWT token expiration
- Password hashing with bcrypt
- SQL injection protection via parameterized queries

## 🐛 Troubleshooting

### CORS Errors

Make sure `FRONTEND_URL` environment variable is set correctly in Railway.

Check Railway logs for CORS messages:
```
⚠️  CORS blocked origin: https://some-origin.com
✅ Allowed origins: [...]
```

### Database Not Persisting

1. Verify volume is mounted at `/data` in Railway
2. Check `DATABASE_PATH=/data/cms.db` is set
3. Test volume: `GET /api/test`

### Module Not Found Errors

Ensure all dependencies are listed in `package.json` and run:
```bash
npm install
```

## 📞 Support

For issues or questions, contact the Nordic MedTek development team.

## 📄 License

Proprietary - © Nordic Medical Technologies

