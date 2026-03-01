const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'assistant', 'system'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const Mind71ChatSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    conversationId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    language: {
        type: String,
        enum: ['en', 'ar'],
        default: 'en'
    },
    title: {
        type: String,
        default: 'New Strategy'
    },
    messages: [ChatMessageSchema],
    lastActivity: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Index for cleanup and faster queries
Mind71ChatSchema.index({ lastActivity: -1 });

module.exports = mongoose.model('Mind71Conversation', Mind71ChatSchema);
