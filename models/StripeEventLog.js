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

// eventId unique index is already created by `unique: true` on the field

module.exports = mongoose.model('StripeEventLog', StripeEventLogSchema);
