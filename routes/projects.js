const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const User = require('../models/User');
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');

// @desc    Get all projects
// @route   GET /api/projects
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { category, status } = req.query;
        const query = {};
        if (category) query.category = category;
        if (status) query.status = status;

        const projects = await Project.find(query).populate('creator', 'username email');
        res.status(200).json({ success: true, count: projects.length, data: projects });
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

// @desc    Create new project
// @route   POST /api/projects
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { title, description, category, location, goalAmount, deadline } = req.body;

        // Input validation
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

        const project = await Project.create({
            title: title.trim(),
            description: description.trim(),
            category: category.toLowerCase(),
            location: location.trim(),
            goalAmount: Number(goalAmount),
            deadline: deadlineDate,
            creator: req.user._id
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

module.exports = router;
