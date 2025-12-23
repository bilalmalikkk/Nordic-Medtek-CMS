import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Import routes
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import categoryRoutes from './routes/categories.js';
import mediaRoutes from './routes/media.js';
import settingsRoutes from './routes/settings.js';
import uploadRoutes from './routes/upload.js';
import importRoutes from './routes/import.js';
import contactRoutes from './routes/contact.js';
import newsRoutes from './routes/news.js';

import { initializeDatabase } from './database/init.js';
import runMigrations from './database/migrate.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Railway deployment
app.set('trust proxy', 1);

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:5173',
            'https://localhost:5173',
            'http://localhost:3000',
            'https://localhost:3000',
            'https://nordic-medtek.vercel.app',
            'https://www.nordicmedtek.no',
            'https://nordicmedtek.no',
            process.env.FRONTEND_URL
        ].filter(Boolean); // Remove undefined values
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('⚠️  CORS blocked origin:', origin);
            console.log('✅ Allowed origins:', allowedOrigins);
            callback(null, false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    preflightContinue: false,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Explicitly handle OPTIONS requests for all routes
app.options('*', cors(corsOptions));

// Security middleware (after CORS)
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false // Disable CSP for API
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // increased limit for production
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files - serve uploads
// Use persistent volume subdirectory in production, local uploads in development
const uploadsPath = process.env.NODE_ENV === 'production' 
    ? '/data/uploads' 
    : path.join(__dirname, 'uploads');

console.log('📁 Uploads path:', uploadsPath);
console.log('📁 Uploads directory exists:', fs.existsSync(uploadsPath));

// Ensure uploads directory exists
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
    console.log('📁 Created uploads directory');
}

app.use('/uploads', express.static(uploadsPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/import', importRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/news', newsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        service: 'NordicMedTek CMS API'
    });
});

// Test endpoint (useful for Railway volume verification)
app.get('/api/test', async (req, res) => {
    try {
        const fs = await import('fs');
        const dbPath = process.env.DATABASE_PATH || '/data/cms.db';
        const dbDir = path.dirname(dbPath);
        
        res.json({
            success: true,
            environment: process.env.NODE_ENV,
            databasePath: dbPath,
            databaseExists: fs.default.existsSync(dbPath),
            directoryExists: fs.default.existsSync(dbDir),
            allowedOrigins: process.env.FRONTEND_URL
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// 404 handler for API routes only
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
async function startServer() {
    try {
        console.log('🔧 Initializing database...');
        await initializeDatabase();
        console.log('✅ Database initialized successfully');
        
        console.log('🔄 Running migrations...');
        await runMigrations();
        console.log('✅ Migrations completed');
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log('🚀 NordicMedTek CMS API Server');
            console.log(`📡 Listening on port ${PORT}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
            console.log(`🎯 Frontend URL: ${process.env.FRONTEND_URL || 'not set'}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

