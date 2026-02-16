const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
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
        default: 'active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for performance
ProjectSchema.index({ category: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ creator: 1 });

module.exports = mongoose.model('Project', ProjectSchema);
