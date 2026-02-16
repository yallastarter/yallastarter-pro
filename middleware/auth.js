const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes — require valid JWT
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // Support both 'userId' (new) and 'id' (legacy) payload keys
            const uid = decoded.userId || decoded.id;
            req.user = await User.findById(uid).select('-password');
            if (!req.user) {
                return res.status(401).json({ success: false, message: 'User not found' });
            }
            return next();
        } catch (error) {
            console.error('Auth middleware error:', error.message);
            return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
        }
    }

    // No token at all
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
};

// Admin only — must be called after protect
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
    }
};

module.exports = { protect, adminOnly };
