const mongoose = require('mongoose');

const StripeEventLogSchema = new mongoose.Schema({
    eventId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    eventType: {
        type: String,
        required: true
    },
    sessionId: {
        type: String,
        index: true
    },
    paymentIntentId: {
        type: String,
        index: true,
        sparse: true
    },
    livemode: {
        type: Boolean,
        required: true
    },
    processedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['processed', 'ignored', 'failed'],
        required: true
    },
    errorMessage: {
        type: String,
        default: null
    },
    rawSummary: {
        type: Object,
        default: null
    }
});

// Unique index on eventId is already handled by unique: true
// but we can be explicit
StripeEventLogSchema.index({ eventId: 1 }, { unique: true });

module.exports = mongoose.model('StripeEventLog', StripeEventLogSchema);
