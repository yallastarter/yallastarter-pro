const mongoose = require('mongoose');

const CoinTransactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        index: true
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        index: true,
        default: null
    },
    type: {
        type: String,
        enum: ['coin_purchase', 'backing', 'transfer_in', 'transfer_out', 'refund'],
        required: true
    },
    coins: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'sar'
    },
    amount: {
        type: Number,
        required: true
    },
    amountMinor: {
        type: Number,
        required: true
    },
    stripeSessionId: {
        type: String,
        index: true,
        sparse: true
    },
    stripePaymentIntentId: {
        type: String,
        index: true,
        sparse: true
    },
    stripeEventId: {
        type: String,
        index: true,
        sparse: true
    },
    status: {
        type: String,
        enum: ['succeeded', 'pending', 'failed', 'refunded'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    metadata: {
        type: Object,
        default: {}
    }
});

// Ensure a single stripe event only credits once for a specific type
CoinTransactionSchema.index({ stripeEventId: 1, type: 1 }, { unique: true, sparse: true });
CoinTransactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('CoinTransaction', CoinTransactionSchema);
