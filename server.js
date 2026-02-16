const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Load environment variables
dotenv.config();

// ==========================================
// Environment Variable Validation
// ==========================================
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
const optionalEnvVars = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];

const missing = requiredEnvVars.filter(v => !process.env[v]);
if (missing.length > 0) {
    console.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
}

// Warn about optional vars
optionalEnvVars.forEach(v => {
    if (!process.env[v]) {
        console.warn(`⚠️  Optional env var ${v} not set. Related features will be disabled.`);
    }
});

if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('⚠️  STRIPE_SECRET_KEY not set. Coin purchases will fail.');
}

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Connect to Database
const connectDB = require('./config/db');
connectDB();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public_html', 'uploads', 'profiles');
fs.mkdirSync(uploadsDir, { recursive: true });

// Middleware — Stripe webhook needs raw body, must be BEFORE json parser
app.use('/api/coins/webhook', express.raw({ type: 'application/json' }));

// Standard middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Security Middleware
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

// Global rate limiting
const globalLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 200, // limit each IP to 200 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', globalLimiter);

// Strict rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 login/signup attempts per 15 min
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many login attempts, please try again after 15 minutes.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Set security headers
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// CORS — restrict in production
const allowedOrigins = [
    process.env.CLIENT_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:3001'
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, same-origin)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    credentials: true
}));

const compression = require('compression');
app.use(compression());

app.use(morgan(isProduction ? 'combined' : 'dev'));

// Passport Config
require('./config/passport');

// Static Files
app.use(express.static(path.join(__dirname, 'public_html')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/coins', require('./routes/coins'));
app.use('/api/admin', require('./routes/admin'));

// Health Check — Render uses this to monitor the service
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// SPA Fallback — serve index.html for any non-API, non-file route
// Express 5 compatible: use a middleware function instead of regex
app.use((req, res, next) => {
    // Only handle GET requests that aren't API calls
    if (req.method !== 'GET' || req.path.startsWith('/api')) {
        return next();
    }
    // If the path has a file extension, let static handler 404 it
    if (path.extname(req.path)) {
        return next();
    }
    res.sendFile(path.join(__dirname, 'public_html', 'index.html'));
});

// 404 handler for unmatched routes
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler — hide stack traces in production
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: isProduction ? 'Internal server error' : err.message,
        ...(isProduction ? {} : { stack: err.stack })
    });
});

// Seed admin user on startup
async function seedAdmin() {
    try {
        const User = require('./models/User');
        const existing = await User.findOne({ username: 'admin' });
        if (!existing) {
            const adminPassword = process.env.ADMIN_PASSWORD || 'YallaAdmin2025!';
            await User.create({
                username: 'admin',
                email: 'admin@yallastarter.com',
                password: adminPassword,
                role: 'admin'
            });
            console.log('✅ Admin user seeded');
        }
    } catch (error) {
        console.error('Admin seed error:', error.message);
    }
}

// Start Server
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
    await seedAdmin();
});

module.exports = app;
