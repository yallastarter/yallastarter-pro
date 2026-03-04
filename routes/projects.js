const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const Project = require('../models/Project');
const User = require('../models/User');
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');

// Multer: use memory storage so images survive Render redeploys
// Images are converted to base64 data URLs and stored in MongoDB
const imageFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const mimetype = file.mimetype && file.mimetype.startsWith('image/');
    if (allowed.test(ext) && mimetype) return cb(null, true);
    cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'));
};
const uploadProjectImage = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max (base64 adds ~33%, keeps under 16MB doc limit)
    fileFilter: imageFilter
});

// @desc    Get all projects (paginated) — public list shows active/completed only
// @route   GET /api/projects
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { category, status, page = '1', limit = '20' } = req.query;
        const query = {};
        if (category) query.category = category.toLowerCase();
        if (status) query.status = status;
        else query.status = { $in: ['active', 'completed'] };

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * limitNum;

        const [projects, total] = await Promise.all([
            Project.find(query).populate('creator', 'username email').sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
            Project.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            count: projects.length,
            data: projects,
            pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Get current user's projects (must be before /:id to avoid matching "user")
// @route   GET /api/projects/user/me
// @access  Private
router.get('/user/me', protect, async (req, res) => {
    try {
        const projects = await Project.find({ creator: req.user._id });
        res.status(200).json({ success: true, count: projects.length, data: projects });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Get single project by PID or ID
// @route   GET /api/projects/:id
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        let project;
        const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id);

        if (isObjectId) {
            project = await Project.findById(req.params.id).populate('creator', 'username');
        } else {
            project = await Project.findOne({ pid: req.params.id.toLowerCase() }).populate('creator', 'username');
        }

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        // Compute fields
        const Transaction = mongoose.model('Transaction');

        // raisedAmount: sum of completed 'send' transactions
        const backings = await Transaction.find({
            project: project._id,
            type: 'send',
            status: 'completed'
        });
        const raisedAmount = backings.reduce((sum, tx) => sum + tx.amount, 0);

        // backersCount: unique users who backed (handling null 'from' for guests)
        const backersCount = new Set(
            backings.map(tx => tx.from ? tx.from.toString() : `guest-${tx._id}`)
        ).size;

        // fundedPercent: min(100, (raisedAmount / goal) * 100)
        const fundedPercent = Math.min(100, Math.round((raisedAmount / project.goalAmount) * 100));

        // daysLeft: max(0, ceil((endDate - now) / 1day))
        const now = new Date();
        const diff = project.deadline - now;
        const daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));

        const publicData = {
            pid: project.pid,
            serialNumber: project.serialNumber,
            title: project.title,
            tagline: project.tagline || project.description.substring(0, 150),
            description: project.description,
            category: project.category,
            location: project.location,
            goalAmount: project.goalAmount,
            raisedAmount,
            backersCount,
            fundedPercent,
            daysLeft,
            heroImageUrl: project.heroImageUrl || project.coverImage,
            cardImageUrl: project.coverImage,
            gallery: project.gallery,
            videoUrl: project.videoUrl,
            story: project.story,
            aboutSections: project.aboutSections && project.aboutSections.length > 0 ? project.aboutSections : [project.story || project.description],
            rewardTiers: project.rewards,
            creator: project.creator,
            status: project.status,
            createdAt: project.createdAt,
            deadline: project.deadline
        };

        res.status(200).json({ success: true, data: publicData });
    } catch (err) {
        console.error('Get project error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Upload project cover image
// @route   POST /api/projects/upload-cover
// @access  Private
router.post('/upload-cover', protect, uploadProjectImage.single('cover'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
        // Convert buffer to base64 data URL (persists in MongoDB, survives Render redeploys)
        const base64 = req.file.buffer.toString('base64');
        const dataUrl = `data:${req.file.mimetype};base64,${base64}`;
        res.json({ success: true, url: dataUrl });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message || 'Upload failed' });
    }
});

// @desc    Upload project gallery image(s)
// @route   POST /api/projects/upload-gallery
// @access  Private
router.post('/upload-gallery', protect, uploadProjectImage.array('gallery', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No files uploaded' });
        const urls = req.files.map(f => {
            const base64 = f.buffer.toString('base64');
            return `data:${f.mimetype};base64,${base64}`;
        });
        res.json({ success: true, urls });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message || 'Upload failed' });
    }
});

// @desc    Create new project
// @route   POST /api/projects
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { title, description, category, location, goalAmount, deadline, coverImage, gallery, videoUrl, story, rewards, status } = req.body;

        if (!title || !description || !category || !location || !goalAmount || !deadline) {
            return res.status(400).json({ success: false, message: 'All fields are required: title, description, category, location, goalAmount, deadline' });
        }

        if (isNaN(goalAmount) || Number(goalAmount) < 1) {
            return res.status(400).json({ success: false, message: 'Goal amount must be a positive number' });
        }

        const deadlineDate = new Date(deadline);
        if (isNaN(deadlineDate.getTime()) || deadlineDate <= new Date()) {
            return res.status(400).json({ success: false, message: 'Deadline must be a valid future date' });
        }

        // Status logic: 'active' is only possible if admin sets it. Users submit as 'pending' (awaiting review).
        // If the user explicitly passes status='draft', keep as draft. Otherwise default to 'pending'.
        let projectStatus = 'pending';
        if (status === 'draft') projectStatus = 'draft';

        const project = await Project.create({
            title: title.trim(),
            pid: req.body.pid, // optional, model hook handles if missing
            tagline: req.body.tagline,
            description: description.trim(),
            category: category.toLowerCase(),
            location: location.trim(),
            goalAmount: Number(goalAmount),
            deadline: deadlineDate,
            creator: req.user._id,
            status: projectStatus,
            coverImage: coverImage || null,
            heroImageUrl: req.body.heroImageUrl || coverImage || null,
            gallery: Array.isArray(gallery) ? gallery : (gallery ? [gallery] : []),
            videoUrl: videoUrl || null,
            story: story || '',
            aboutSections: req.body.aboutSections || [],
            rewards: rewards || []
        });

        res.status(201).json({ success: true, data: project });
    } catch (err) {
        console.error('Create project error:', err.name, err.code, err.message);

        // MongoDB duplicate key (E11000) — pid collision
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern || {})[0] || 'field';
            const label = field === 'pid' ? 'project URL (generated from title, already taken)' : field;
            return res.status(400).json({
                success: false,
                message: `Duplicate: a project with this ${label} already exists. Try a slightly different title.`
            });
        }

        // Mongoose validation errors — show all fields
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed: ' + messages.join(' | ')
            });
        }

        res.status(500).json({ success: false, message: `Server error: ${err.message}` });
    }
});

// @desc    Update project (creator only)
// @route   PUT /api/projects/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid project ID' });
        }
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
        if (project.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this project' });
        }
        const { title, description, category, location, goalAmount, deadline, coverImage, gallery, videoUrl, story, rewards, status } = req.body;
        if (title !== undefined) project.title = title.trim();
        if (description !== undefined) project.description = description.trim();
        if (category !== undefined) project.category = category.toLowerCase();
        if (location !== undefined) project.location = location.trim();
        if (goalAmount !== undefined) project.goalAmount = Number(goalAmount);
        if (deadline !== undefined) project.deadline = new Date(deadline);
        if (coverImage !== undefined) project.coverImage = coverImage;
        if (gallery !== undefined) project.gallery = Array.isArray(gallery) ? gallery : (gallery ? [gallery] : []);
        if (videoUrl !== undefined) project.videoUrl = videoUrl;
        if (story !== undefined) project.story = story;
        if (rewards !== undefined) project.rewards = rewards;
        // Users can only revert to draft; 'active'/'completed' require admin approval
        if (status !== undefined && status === 'draft') project.status = status;
        await project.save();
        res.json({ success: true, data: project });
    } catch (err) {
        console.error('Update project error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Toggle favourite on a project
// @route   POST /api/projects/:id/favorite
// @access  Private
router.post('/:id/favorite', protect, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid project ID' });
        }
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        const user = await User.findById(req.user._id);
        const alreadyFav = user.favorites.some(f => f.toString() === req.params.id);

        if (alreadyFav) {
            user.favorites = user.favorites.filter(f => f.toString() !== req.params.id);
        } else {
            user.favorites.push(req.params.id);
        }
        await user.save();
        res.json({ success: true, favorited: !alreadyFav, totalFavorites: user.favorites.length });
    } catch (err) {
        console.error('Favorite toggle error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Get current user's favourited projects
// @route   GET /api/projects/favorites/me
// @access  Private
router.get('/favorites/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate({
            path: 'favorites',
            select: 'title category location currentAmount goalAmount status coverImage serialNumber',
            match: { status: { $in: ['active', 'completed'] } }
        });
        const favorites = user.favorites.filter(Boolean);
        res.json({ success: true, count: favorites.length, data: favorites });
    } catch (err) {
        console.error('Get favorites error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Check if a project is favorited by the current user
// @route   GET /api/projects/:id/favorite
// @access  Private
router.get('/:id/favorite', protect, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid project ID' });
        }
        const user = await User.findById(req.user._id).select('favorites');
        const favorited = user.favorites.some(f => f.toString() === req.params.id);
        res.json({ success: true, favorited });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Delete project (creator only) + refund backers
// @route   DELETE /api/projects/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid project ID' });
        }
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
        if (project.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this project' });
        }
        // Only allow delete if not active (or if pending/draft/rejected)
        // Active projects with backers: refund all backers
        let refundCount = 0;
        if (project.currentAmount > 0) {
            // Find all send transactions for this project and refund
            const Transaction = mongoose.model('Transaction');
            const backerTxns = await Transaction.find({
                project: project._id,
                type: 'send',
                status: 'completed'
            });
            for (const tx of backerTxns) {
                await User.findByIdAndUpdate(tx.from, { $inc: { coinBalance: tx.amount } });
                await Transaction.findByIdAndUpdate(tx._id, { status: 'refunded' });
                refundCount++;
            }
        }
        await Project.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: `Project deleted successfully.${refundCount > 0 ? ` ${refundCount} backer(s) have been refunded.` : ''}` });
    } catch (err) {
        console.error('Delete project error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
