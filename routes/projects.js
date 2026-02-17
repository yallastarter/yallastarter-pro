const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const Project = require('../models/Project');
const User = require('../models/User');
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');

// Multer for project images (cover + gallery)
const projectStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public_html/uploads/projects/');
    },
    filename: function (req, file, cb) {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = (path.extname(file.originalname) || '').toLowerCase() || '.jpg';
        cb(null, 'project-' + unique + ext);
    }
});
const imageFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const mimetype = file.mimetype && file.mimetype.startsWith('image/');
    if (allowed.test(ext) && mimetype) return cb(null, true);
    cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'));
};
const uploadProjectImage = multer({
    storage: projectStorage,
    limits: { fileSize: 8 * 1024 * 1024 },
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

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid project ID' });
        }

        const project = await Project.findById(req.params.id).populate('creator', 'username email');

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        res.status(200).json({ success: true, data: project });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Upload project cover image
// @route   POST /api/projects/upload-cover
// @access  Private
router.post('/upload-cover', protect, uploadProjectImage.single('cover'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
        const url = '/uploads/projects/' + req.file.filename;
        res.json({ success: true, url });
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
        const urls = req.files.map(f => '/uploads/projects/' + f.filename);
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

        const projectStatus = status === 'active' ? 'active' : 'draft';
        const project = await Project.create({
            title: title.trim(),
            description: description.trim(),
            category: category.toLowerCase(),
            location: location.trim(),
            goalAmount: Number(goalAmount),
            deadline: deadlineDate,
            creator: req.user._id,
            status: projectStatus,
            coverImage: coverImage || null,
            gallery: Array.isArray(gallery) ? gallery : (gallery ? [gallery] : []),
            videoUrl: videoUrl || null,
            story: story || '',
            rewards: rewards || ''
        });

        res.status(201).json({ success: true, data: project });
    } catch (err) {
        console.error('Create project error:', err.message);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: err.message });
        }
        res.status(500).json({ success: false, message: 'Server error' });
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
        if (status !== undefined && ['draft', 'active', 'completed'].includes(status)) project.status = status;
        await project.save();
        res.json({ success: true, data: project });
    } catch (err) {
        console.error('Update project error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
