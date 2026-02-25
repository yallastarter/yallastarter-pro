const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    serialNumber: {
        type: String,
        unique: true,
        index: true
    },
    title: {
        type: String,
        required: [true, 'Please add a project title'],
        trim: true,
        maxlength: [100, 'Title cannot be more than 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Please add a description'],
        maxlength: [5000, 'Description cannot be more than 5000 characters']
    },
    category: {
        type: String,
        required: [true, 'Please select a category'],
        enum: [
            'technology',
            'arts',
            'environment',
            'education',
            'entertainment',
            'food',
            'social'
        ]
    },
    location: {
        type: String,
        required: true
    },
    goalAmount: {
        type: Number,
        required: [true, 'Please add a funding goal']
    },
    currentAmount: {
        type: Number,
        default: 0
    },
    deadline: {
        type: Date,
        required: true
    },
    creator: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['draft', 'active', 'completed'],
        default: 'draft'
    },
    coverImage: { type: String, default: null },
    gallery: [{ type: String }],
    videoUrl: { type: String, default: null },
    story: { type: String, default: '' },
    rewards: { type: String, default: '' },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Auto-generate unique serial number before saving (YS-XXXXXXXX)
ProjectSchema.pre('save', async function (next) {
    if (!this.serialNumber) {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        this.serialNumber = `YS-${timestamp}${random}`;
    }
    next();
});

// Indexes for performance
ProjectSchema.index({ category: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ creator: 1 });

module.exports = mongoose.model('Project', ProjectSchema);
