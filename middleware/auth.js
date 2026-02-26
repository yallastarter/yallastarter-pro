const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes — require valid JWT
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const uid = decoded.userId || decoded.id;
            req.user = await User.findById(uid).select('-password');
            if (!req.user) {
                return res.status(401).json({ success: false, message: 'User not found' });
            }
            if (req.user.suspended) {
                return res.status(403).json({ success: false, message: 'Your account has been suspended' });
            }
            return next();
        } catch (error) {
            console.error('Auth middleware error:', error.message);
            return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
        }
    }

    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
};

// Admin only (role === 'admin')
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') return next();
    return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
};

// Manager or Admin (can do most things except manage staff)
const managerOrAdmin = (req, res, next) => {
    if (req.user && ['admin', 'manager'].includes(req.user.role)) return next();
    return res.status(403).json({ success: false, message: 'Access denied. Manager or Admin only.' });
};

// Any staff member (employee, manager, admin)
const staffOnly = (req, res, next) => {
    if (req.user && ['admin', 'manager', 'employee'].includes(req.user.role)) return next();
    return res.status(403).json({ success: false, message: 'Access denied. Staff only.' });
};

// Check a specific permission (used for granular employee access)
const requirePermission = (perm) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
    if (req.user.role === 'admin' || req.user.role === 'manager') return next();
    if (req.user.permissions && req.user.permissions[perm]) return next();
    return res.status(403).json({ success: false, message: `Access denied. Requires permission: ${perm}` });
};

module.exports = { protect, adminOnly, managerOrAdmin, staffOnly, requirePermission };
