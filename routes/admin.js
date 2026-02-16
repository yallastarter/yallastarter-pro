const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect, adminOnly } = require('../middleware/auth');
const User = require('../models/User');
const Project = require('../models/Project');
const Transaction = require('../models/Transaction');

// All admin routes require authentication + admin role
router.use(protect, adminOnly);

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Admin
router.get('/dashboard', async (req, res) => {
    try {
        const [
            totalUsers,
            totalProjects,
            activeProjects,
            completedProjects,
            totalTransactions,
            recentUsers,
            recentTransactions
        ] = await Promise.all([
            User.countDocuments({ role: { $ne: 'admin' } }),
            Project.countDocuments(),
            Project.countDocuments({ status: 'active' }),
            Project.countDocuments({ status: 'completed' }),
            Transaction.countDocuments({ status: 'completed' }),
            User.find({ role: { $ne: 'admin' } })
                .select('username email coinBalance createdAt')
                .sort({ createdAt: -1 })
                .limit(5),
            Transaction.find({ status: 'completed' })
                .populate('from', 'username')
                .populate('to', 'username')
                .populate('project', 'title')
                .sort({ createdAt: -1 })
                .limit(10)
        ]);

        // Aggregate stats
        const coinStats = await Transaction.aggregate([
            { $match: { status: 'completed' } },
            {
                $group: {
                    _id: '$type',
                    totalAmount: { $sum: '$amount' },
                    totalFees: { $sum: '$fee' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const totalCoinsBought = coinStats.find(s => s._id === 'purchase')?.totalAmount || 0;
        const totalCoinsSent = coinStats.find(s => s._id === 'send')?.totalAmount || 0;
        const totalCashouts = coinStats.find(s => s._id === 'cashout')?.totalAmount || 0;
        const totalFeesEarned = coinStats.find(s => s._id === 'cashout')?.totalFees || 0;

        // Revenue over last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const dailyRevenue = await Transaction.aggregate([
            {
                $match: {
                    type: 'purchase',
                    status: 'completed',
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    amount: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // User growth over last 30 days
        const userGrowth = await User.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo }, role: { $ne: 'admin' } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Top funded projects
        const topProjects = await Project.find({ status: 'active' })
            .populate('creator', 'username')
            .sort({ currentAmount: -1 })
            .limit(5);

        res.json({
            success: true,
            data: {
                overview: {
                    totalUsers,
                    totalProjects,
                    activeProjects,
                    completedProjects,
                    totalTransactions,
                    totalCoinsBought,
                    totalCoinsSent,
                    totalCashouts,
                    totalFeesEarned,
                    platformRevenue: totalFeesEarned
                },
                charts: {
                    dailyRevenue,
                    userGrowth
                },
                recentUsers,
                recentTransactions,
                topProjects
            }
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Admin
router.get('/users', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const skip = (page - 1) * limit;

        const query = { role: { $ne: 'admin' } };
        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            data: users,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Update user (suspend/activate/modify)
// @route   PUT /api/admin/users/:id
// @access  Admin
router.put('/users/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }

        const { role, coinBalance } = req.body;
        const updates = {};
        if (role !== undefined) {
            if (!['user', 'admin'].includes(role)) {
                return res.status(400).json({ success: false, message: 'Role must be user or admin' });
            }
            updates.role = role;
        }
        if (coinBalance !== undefined) {
            const bal = parseInt(coinBalance);
            if (isNaN(bal) || bal < 0) {
                return res.status(400).json({ success: false, message: 'Coin balance must be a non-negative number' });
            }
            updates.coinBalance = bal;
        }

        const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true })
            .select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, data: user });
    } catch (error) {
        console.error('Admin update user error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Get all projects
// @route   GET /api/admin/projects
// @access  Admin
router.get('/projects', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status || '';
        const skip = (page - 1) * limit;

        const query = {};
        if (status) query.status = status;

        const projects = await Project.find(query)
            .populate('creator', 'username email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Project.countDocuments(query);

        res.json({
            success: true,
            data: projects,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('Admin projects error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Update project status
// @route   PUT /api/admin/projects/:id
// @access  Admin
router.put('/projects/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid project ID' });
        }

        const { status } = req.body;
        if (!status || !['draft', 'active', 'completed'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Status must be draft, active, or completed' });
        }

        const project = await Project.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).populate('creator', 'username email');

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        res.json({ success: true, data: project });
    } catch (error) {
        console.error('Admin update project error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Get all transactions
// @route   GET /api/admin/transactions
// @access  Admin
router.get('/transactions', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const type = req.query.type || '';
        const skip = (page - 1) * limit;

        const query = {};
        if (type) query.type = type;

        const transactions = await Transaction.find(query)
            .populate('from', 'username email')
            .populate('to', 'username email')
            .populate('project', 'title')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Transaction.countDocuments(query);

        res.json({
            success: true,
            data: transactions,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('Admin transactions error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Get pending cashout requests
// @route   GET /api/admin/cashouts
// @access  Admin
router.get('/cashouts', async (req, res) => {
    try {
        const transactions = await Transaction.find({
            type: 'cashout',
            status: req.query.status || 'pending'
        })
            .populate('from', 'username email bankAccount')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: transactions });
    } catch (error) {
        console.error('Admin cashouts error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Approve/reject cashout
// @route   PUT /api/admin/cashouts/:id
// @access  Admin
router.put('/cashouts/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid cashout ID' });
        }

        const { status } = req.body; // 'completed' or 'failed'

        if (!['completed', 'failed'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Status must be completed or failed' });
        }

        const transaction = await Transaction.findById(req.params.id);

        if (!transaction || transaction.type !== 'cashout') {
            return res.status(404).json({ success: false, message: 'Cashout request not found' });
        }

        if (transaction.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'This cashout has already been processed' });
        }

        transaction.status = status;
        await transaction.save();

        // If rejected, refund coins to user
        if (status === 'failed') {
            await User.findByIdAndUpdate(transaction.from, {
                $inc: { coinBalance: transaction.amount, totalSpent: -transaction.amount }
            });
        }

        res.json({ success: true, data: transaction });
    } catch (error) {
        console.error('Admin cashout update error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
