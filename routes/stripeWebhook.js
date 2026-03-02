const express = require('express');
const router = express.Router();

/**
 * GET /api/stripe/webhook
 * Safe verification endpoint for browser check.
 */
router.get("/webhook", (req, res) => {
    return res.status(200).json({
        ok: true,
        route: "/api/stripe/webhook"
    });
});

/**
 * POST /api/stripe/webhook
 * Main Stripe webhook receiver.
 * Uses express.raw() specifically on this route to preserve raw body signature.
 */
router.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
    console.log("✅ Stripe webhook hit", new Date().toISOString());
    // In a real scenario, you'd use the raw body for Stripe signature verification.
    return res.status(200).json({ received: true });
});

module.exports = router;
