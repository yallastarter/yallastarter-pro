const express = require('express');
const router = express.Router();

/**
 * GET /api/stripe/webhook
 * Safe verification endpoint for Stripe webhook route.
 */
router.get('/webhook', (req, res) => {
    res.status(200).json({
        ok: true,
        route: "stripe webhook",
        timestamp: new Date().toISOString()
    });
});

/**
 * POST /api/stripe/webhook
 * Main Stripe webhook receiver.
 * Uses express.raw() middleware mounted in server.js to preserve raw body.
 */
router.post('/webhook', (req, res) => {
    console.log("Stripe webhook hit", new Date().toISOString());

    // For now, we just acknowledge receipt.
    // Stripe expects a 200 response to acknowledge successful delivery.
    res.status(200).json({ received: true });
});

module.exports = router;
