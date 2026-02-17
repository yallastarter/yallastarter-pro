const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['purchase', 'send', 'cashout'],
        required: true
    },
    from: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    to: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        default: null
    },
    project: {
        type: mongoose.Schema.ObjectId,
        ref: 'Project',
        default: null
    },
    amount: {
        type: Number,
        required: [true, 'Transaction amount is required'],
        min: [1, 'Minimum transaction is 1 coin']
    },
    fee: {
        type: Number,
        default: 0
    },
    netAmount: {
        type: Number,
        default: 0
    },
    stripePaymentId: {
        type: String,
        default: null
    },
    stripeSessionId: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'cancelled'],
        default: 'pending'
    },
    description: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient queries
TransactionSchema.index({ from: 1, createdAt: -1 });
TransactionSchema.index({ to: 1, createdAt: -1 });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ type: 1, createdAt: -1 });
TransactionSchema.index({ stripeSessionId: 1 }, { sparse: true });

module.exports = mongoose.model('Transaction', TransactionSchema);
