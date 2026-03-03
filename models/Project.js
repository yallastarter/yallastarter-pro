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
        unique: true,
        trim: true,
        maxlength: [100, 'Title cannot be more than 100 characters']
    },
    pid: {
        type: String,
        unique: true,
        index: true,
        lowercase: true,
        trim: true
    },
    tagline: {
        type: String,
        trim: true,
        maxlength: [200, 'Tagline cannot be more than 200 characters']
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
        enum: ['draft', 'pending', 'active', 'completed', 'rejected'],
        default: 'draft'
    },
    coverImage: { type: String, default: null },
    heroImageUrl: { type: String, default: null },
    gallery: [{ type: String }],
    videoUrl: { type: String, default: null },
    story: { type: String, default: '' },
    aboutSections: [{ type: String }],
    rewards: [{
        title: { type: String },
        amount: { type: Number },
        description: { type: String },
        includes: [{ type: String }],
        deliveryDate: { type: String }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Auto-generate unique serial number and pid before saving
ProjectSchema.pre('save', async function (next) {
    if (!this.serialNumber) {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        this.serialNumber = `YS-${timestamp}${random}`;
    }

    if (!this.pid && this.title) {
        // Slugify title: "The Abyss" -> "the-abyss"
        this.pid = this.title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '') // remove non-word chars except space and dash
            .replace(/\s+/g, '-')     // replace spaces with dash
            .replace(/-+/g, '-')      // replace multiple dashes with single dash
            .trim();

        // Ensure uniqueness for pid (simple suffix if collision)
        let pidExists = await mongoose.models.Project.findOne({ pid: this.pid });
        if (pidExists && pidExists._id.toString() !== this._id.toString()) {
            this.pid = `${this.pid}-${Math.random().toString(36).substring(2, 5)}`;
        }
    }
    next();
});

// Indexes for performance
ProjectSchema.index({ category: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ status: 1, createdAt: -1 }); // For pending review queries
ProjectSchema.index({ creator: 1 });

module.exports = mongoose.model('Project', ProjectSchema);
