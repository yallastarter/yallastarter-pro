const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to Database
const connectDB = require('./config/db');
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet({
    contentSecurityPolicy: false, // Disabled for simplicity during development with inline scripts/styles
}));
app.use(morgan('dev'));

// Static Files
app.use(express.static(path.join(__dirname, 'public_html')));

// Routes (Placeholders for now)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));

// Fallback to index.html for SPA-like behavior or 404
// app.get('/*', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public_html', 'index.html'));
// });

// Start Server (Only if not in Vercel)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
