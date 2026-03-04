const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Project = require('../models/Project');
const Transaction = require('../models/Transaction');
const StripeEventLog = require('../models/StripeEventLog');
const CoinTransaction = require('../models/CoinTransaction');
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const nodemailer = require('nodemailer');

// Initialize Stripe only if key is available
let stripe;
if (process.env.STRIPE_SECRET_KEY) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

// ── Email helper ──────────────────────────────────────────────────────────────
async function sendPaymentConfirmationEmail({ toEmail, toName, coins, amount, projectTitle, projectPid, transactionId }) {
    // Only send if SMTP config is provided
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const fromEmail = process.env.SMTP_FROM || smtpUser || 'noreply@yallastarter.com';
    const clientUrl = process.env.CLIENT_URL || 'https://www.yallastarter.com';

    if (!smtpUser || !smtpPass) {
        console.warn('[EMAIL] SMTP_USER/SMTP_PASS not configured — skipping email confirmation.');
        return;
    }

    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass }
    });

    const projectSection = projectTitle ? `
        <div style="background:#f0fdf4;border:1.5px solid #a7f3d0;border-radius:12px;padding:1rem 1.25rem;margin:1.5rem 0;">
          <div style="font-size:0.85rem;color:#059669;font-weight:600;margin-bottom:0.25rem;">PROJECT SUPPORTED</div>
          <div style="font-size:1.1rem;font-weight:700;color:#111;">${projectTitle}</div>
          ${projectPid ? `<a href="${clientUrl}/project.html?pid=${encodeURIComponent(projectPid)}" style="font-size:0.85rem;color:#006c35;text-decoration:none;">View project →</a>` : ''}
        </div>` : '';

    const html = `
    <!DOCTYPE html>
    <html><head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f4f7f6;">
      <div style="max-width:560px;margin:2rem auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,108,53,0.12);">
        <div style="background:linear-gradient(135deg,#006c35,#00a651);padding:2.5rem 2rem;text-align:center;">
          <div style="font-size:3.5rem;margin-bottom:0.5rem;">✅</div>
          <h1 style="color:white;margin:0;font-size:1.6rem;font-weight:800;">Payment Confirmed!</h1>
          <p style="color:rgba(255,255,255,0.85);margin:0.5rem 0 0;font-size:1rem;">Thank you for supporting YallaStarter</p>
        </div>
        <div style="padding:2rem;">
          <p style="color:#444;font-size:1rem;">Hi <strong>${toName || 'Backer'}</strong>,</p>
          <p style="color:#444;">Your payment of <strong>SAR ${amount.toLocaleString()}</strong> was successful. <strong>${coins.toLocaleString()} coins</strong> have been added to your wallet.</p>
          ${projectSection}
          <div style="background:#f8f9fa;border-radius:12px;padding:1rem 1.25rem;margin:1.5rem 0;">
            <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
              <tr><td style="color:#666;padding:0.3rem 0;">Coins purchased</td><td style="text-align:right;font-weight:700;">${coins.toLocaleString()}</td></tr>
              <tr><td style="color:#666;padding:0.3rem 0;">Amount charged</td><td style="text-align:right;font-weight:700;">SAR ${amount.toLocaleString()}</td></tr>
              ${transactionId ? `<tr><td style="color:#666;padding:0.3rem 0;">Transaction ID</td><td style="text-align:right;font-size:0.8rem;color:#888;">${transactionId}</td></tr>` : ''}
            </table>
          </div>
          <div style="text-align:center;margin:2rem 0;">
            <a href="${clientUrl}/coins.html" style="background:linear-gradient(135deg,#006c35,#00a651);color:white;padding:0.85rem 2rem;border-radius:50px;text-decoration:none;font-weight:700;font-size:1rem;">View My Wallet</a>
          </div>
          <p style="color:#888;font-size:0.8rem;text-align:center;">This email was sent to ${toEmail}. If you did not make this purchase, please contact support immediately.</p>
        </div>
      </div>
    </body></html>`;

    try {
        await transporter.sendMail({
            from: `"YallaStarter" <${fromEmail}>`,
            to: toEmail,
            subject: `✅ Payment Confirmed — ${coins} Coins Added${projectTitle ? ` | ${projectTitle}` : ''}`,
            html
        });
        console.log(`[EMAIL] Confirmation sent to ${toEmail}`);
    } catch (err) {
        console.error('[EMAIL] Failed to send confirmation:', err.message);
    }
}


// @desc    Get coin balance
// @route   GET /api/coins/balance
// @access  Private
router.get('/balance', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('coinBalance totalEarned totalSpent');
        res.json({
            success: true,
            balance: user.coinBalance,
            totalEarned: user.totalEarned,
            totalSpent: user.totalSpent
        });
    } catch (error) {
        console.error('Balance fetch error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Create Stripe checkout session to buy coins
// @route   POST /api/coins/buy
// @access  Private
router.post('/buy', protect, async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({ success: false, message: 'Payment service not configured' });
        }

        const { amount, pid, projectTitle } = req.body;
        const coinAmount = parseInt(amount);

        if (!coinAmount || coinAmount < 1 || isNaN(coinAmount)) {
            return res.status(400).json({ success: false, message: 'Minimum purchase is 1 coin' });
        }

        if (coinAmount > 100000) {
            return res.status(400).json({ success: false, message: 'Maximum purchase is 100,000 coins per transaction' });
        }

        // 1 coin = 1 SAR — Stripe uses halalas (smallest unit), 1 SAR = 100 halalas
        const amountInHalalas = coinAmount * 100;

        // Resolve project info from pid if provided
        let resolvedProjectTitle = projectTitle || null;
        let resolvedProjectPid = pid || null;
        if (pid && !resolvedProjectTitle) {
            try {
                const proj = await Project.findOne({ pid: pid.toLowerCase() }).select('title pid').lean();
                if (proj) { resolvedProjectTitle = proj.title; resolvedProjectPid = proj.pid; }
            } catch (_) { }
        }

        // Build line item description
        const itemName = resolvedProjectTitle
            ? `${coinAmount} YallaStarter Coins (backing: ${resolvedProjectTitle})`
            : `${coinAmount} YallaStarter Coins`;
        const baseUrl = process.env.CLIENT_URL || req.headers.origin;
        const successUrl = resolvedProjectPid
            ? `${baseUrl}/checkout.html?pid=${encodeURIComponent(resolvedProjectPid)}&purchase=success&session_id={CHECKOUT_SESSION_ID}`
            : `${baseUrl}/coins.html?purchase=success&session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = resolvedProjectPid
            ? `${baseUrl}/checkout.html?pid=${encodeURIComponent(resolvedProjectPid)}&purchase=cancelled`
            : `${baseUrl}/coins.html?purchase=cancelled`;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'sar',
                    product_data: {
                        name: itemName,
                        description: `1 coin = 1 SAR. Coins are added to your YallaStarter wallet instantly after payment.`,
                        images: []
                    },
                    unit_amount: amountInHalalas,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                userId: req.user._id.toString(),
                userEmail: req.user.email,
                userName: req.user.username || '',
                coinAmount: coinAmount.toString(),
                coins: coinAmount.toString(),
                currency: 'sar',
                amountMinor: amountInHalalas.toString(),
                type: 'coin_purchase',
                ...(resolvedProjectPid ? { projectPid: resolvedProjectPid } : {}),
                ...(resolvedProjectTitle ? { projectTitle: resolvedProjectTitle } : {})
            },
            client_reference_id: req.user._id.toString(),
            customer_email: req.user.email
        });

        // Create pending legacy transaction
        await Transaction.create({
            type: 'purchase',
            from: req.user._id,
            amount: coinAmount,
            stripeSessionId: session.id,
            status: 'pending',
            description: `Purchase of ${coinAmount} coins${resolvedProjectTitle ? ` for ${resolvedProjectTitle}` : ''}`
        });

        // Create pending CoinTransaction audit record
        await CoinTransaction.create({
            userId: req.user._id,
            type: 'coin_purchase',
            coins: coinAmount,
            amount: coinAmount,
            amountMinor: amountInHalalas,
            currency: 'sar',
            stripeSessionId: session.id,
            status: 'pending',
            metadata: { initial: true, projectPid: resolvedProjectPid, projectTitle: resolvedProjectTitle }
        });

        res.json({
            success: true,
            sessionId: session.id,
            url: session.url
        });
    } catch (error) {
        console.error('Coin purchase error:', error);
        res.status(500).json({ success: false, message: 'Payment processing error' });
    }
});

// @desc    Create Stripe checkout session for GUEST (no login)
// @route   POST /api/coins/guest-buy
// @access  Public
router.post('/guest-buy', async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({ success: false, message: 'Payment service not configured' });
        }

        const { amount, pid, projectTitle, email } = req.body;
        const coinAmount = parseInt(amount);

        if (!coinAmount || coinAmount < 1 || isNaN(coinAmount)) {
            return res.status(400).json({ success: false, message: 'Minimum purchase is 1 coin' });
        }

        if (!email || !email.includes('@')) {
            return res.status(400).json({ success: false, message: 'Valid email required for guest checkout' });
        }

        // 1 coin = 1 SAR
        const amountInHalalas = coinAmount * 100;

        // Resolve project info
        let resolvedProjectTitle = projectTitle || null;
        let resolvedProjectPid = pid || null;
        let resolvedProjectId = null;

        if (pid) {
            try {
                const proj = await Project.findOne({ pid: pid.toLowerCase() }).select('title pid _id').lean();
                if (proj) {
                    resolvedProjectTitle = proj.title;
                    resolvedProjectPid = proj.pid;
                    resolvedProjectId = proj._id;
                }
            } catch (_) { }
        }

        const baseUrl = process.env.CLIENT_URL || req.headers.origin;
        const successUrl = `${baseUrl}/guest-checkout.html?purchase=success&session_id={CHECKOUT_SESSION_ID}${resolvedProjectPid ? `&pid=${resolvedProjectPid}` : ''}`;
        const cancelUrl = `${baseUrl}/guest-checkout.html?purchase=cancelled${resolvedProjectPid ? `&pid=${resolvedProjectPid}` : ''}`;

        const itemName = resolvedProjectTitle
            ? `${coinAmount} Coins (Guest Backing: ${resolvedProjectTitle})`
            : `${coinAmount} YallaStarter Coins (Guest)`;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'sar',
                    product_data: {
                        name: itemName,
                        description: `Instant backing for ${resolvedProjectTitle || 'a project'}. No account needed.`,
                    },
                    unit_amount: amountInHalalas,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            customer_email: email,
            metadata: {
                isGuest: 'true',
                userEmail: email,
                coinAmount: coinAmount.toString(),
                coins: coinAmount.toString(),
                currency: 'sar',
                amountMinor: amountInHalalas.toString(),
                type: 'guest_backing',
                projectPid: resolvedProjectPid || '',
                projectId: resolvedProjectId ? resolvedProjectId.toString() : '',
                projectTitle: resolvedProjectTitle || ''
            }
        });

        // Create a pending transaction for tracking (optional since no user, but good for logs)
        await Transaction.create({
            type: 'purchase',
            from: null, // Guest
            amount: coinAmount,
            stripeSessionId: session.id,
            status: 'pending',
            description: `Guest purchase of ${coinAmount} coins${resolvedProjectTitle ? ` for ${resolvedProjectTitle}` : ''}`
        });

        res.json({
            success: true,
            sessionId: session.id,
            url: session.url
        });
    } catch (error) {
        console.error('Guest purchase error:', error);
        res.status(500).json({ success: false, message: 'Payment processing error' });
    }
});

// @desc    Stripe webhook info
// @route   GET /api/coins/webhook
// @access  Public
router.get('/webhook', (req, res) => {
    res.status(200).json({
        ok: true,
        route: "/api/coins/webhook",
        message: "Stripe webhook endpoint. Use POST for actual webhooks."
    });
});

// Webhook handler function (exported for aliasing)
const handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        if (process.env.STRIPE_WEBHOOK_SECRET && stripe) {
            event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        } else {
            // In dev/test mode without webhook secret, parse body directly
            event = JSON.parse(req.body.toString());
        }
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const eventId = event.id;
    const eventType = event.type;

    // 1. Idempotency Check: Log the event
    let eventLog;
    try {
        eventLog = await StripeEventLog.create({
            eventId: eventId,
            eventType: eventType,
            sessionId: event.data.object.id,
            paymentIntentId: event.data.object.payment_intent,
            livemode: event.livemode,
            status: 'ignored', // Default, update later
            rawSummary: {
                id: event.id,
                type: event.type,
                session: event.data.object.id
            }
        });
    } catch (err) {
        if (err.code === 11000) {
            console.log(`[WEBHOOK] Duplicate event ${eventId} ignored.`);
            return res.status(200).json({ received: true, duplicate: true });
        }
        console.error(`[WEBHOOK] Error logging event ${eventId}:`, err.message);
        return res.status(500).json({ error: 'Database error' });
    }

    // 2. Process specific events
    if (eventType === 'checkout.session.completed') {
        const session = event.data.object;
        const metadata = session.metadata;

        if (!metadata || !metadata.coins || (!metadata.userId && metadata.isGuest !== 'true')) {
            console.error(`[WEBHOOK] Missing metadata for session ${session.id}`);
            eventLog.status = 'failed';
            eventLog.errorMessage = 'Missing metadata (userId/isGuest/coins)';
            await eventLog.save();
            return res.status(200).json({ received: true, error: 'missing_metadata' });
        }

        const isGuest = metadata.isGuest === 'true';
        const userId = metadata.userId || null;
        const projectId = metadata.projectId || null;
        const coins = parseInt(metadata.coins);
        const amountMinor = parseInt(metadata.amountMinor || (coins * 100));
        const currency = (metadata.currency || 'sar').toLowerCase();

        // Validation
        if (isNaN(coins) || coins <= 0) {
            eventLog.status = 'failed';
            eventLog.errorMessage = `Invalid coins value: ${metadata.coins}`;
            await eventLog.save();
            return res.status(200).json({ received: true, error: 'invalid_coins' });
        }

        try {
            // 3. Atomic Updates (using session if possible, but Atlas free tier might not support it reliably without replica sets)
            // We use fine-grained updates and idempotency guards.

            // Deduplicate at CoinTransaction level too (belt and braces)
            const existingTx = await CoinTransaction.findOne({ stripeEventId: eventId, type: 'coin_purchase' });
            if (existingTx) {
                eventLog.status = 'processed';
                await eventLog.save();
                return res.status(200).json({ received: true, note: 'already_credited' });
            }

            // Perform updates
            let userUpdate = null;
            if (!isGuest && userId) {
                userUpdate = await User.findByIdAndUpdate(userId, {
                    $inc: { coinBalance: coins }
                }, { new: true });
                if (!userUpdate) throw new Error(`User ${userId} not found`);
            }

            // If it's a backing (guest or user), credit the project creator
            if (projectId) {
                const project = await Project.findById(projectId);
                if (project) {
                    // Credit creator (atomic)
                    await User.findByIdAndUpdate(project.creator, {
                        $inc: { coinBalance: coins, totalEarned: coins }
                    });

                    // Update project funding (atomic)
                    await Project.findByIdAndUpdate(projectId, {
                        $inc: { currentAmount: coins }
                    });

                    // If user (not guest), deduct the coins we just added to their balance immediately
                    // OR better: if it was a direct backing purchase, don't even add to user balance?
                    // The current /buy logic for users says "Purchased X coins for project Y".
                    // The webhook currently credits the USER. 
                    // To be consistent with "direct backing", we should either:
                    // A) Credit user then user sends to project (requires 2 steps)
                    // B) Credit project creator directly and user record shows "Backed Project X"

                    // The user's metadata has projectPid if they specified it in /buy.
                    // For now, let's keep it simple: if it's a guest, credit creator.
                    // If it's a user, they get the coins in their balance (as per existing logic), 
                    // and if they want to back, the frontend usually calls /send after confirmation OR the purchase was just "buying coins".
                    // Wait, the existing /buy route doesn't automatically back. It just buys coins.
                    // But if it's a GUEST, they HAVE to back automatically because they have no wallet.

                    if (isGuest) {
                        console.log(`[WEBHOOK] Guest backing: Crediting project ${projectId}`);
                    }
                }
            }

            // Create success audit record
            await CoinTransaction.findOneAndUpdate(
                { stripeSessionId: session.id, type: isGuest ? 'backing' : 'coin_purchase' },
                {
                    userId,
                    projectId,
                    coins,
                    amount: coins, // 1:1 ratio
                    amountMinor,
                    currency,
                    stripePaymentIntentId: session.payment_intent,
                    stripeEventId: eventId,
                    status: 'succeeded',
                    metadata: { ...metadata, processedAt: new Date() }
                },
                { upsert: true, new: true }
            );

            // Update legacy transaction for backward compatibility
            await Transaction.findOneAndUpdate(
                { stripeSessionId: session.id },
                {
                    status: 'completed',
                    stripePaymentId: session.payment_intent,
                    project: projectId,
                    type: isGuest ? 'send' : 'purchase'
                },
                { new: true }
            );

            console.log(`[WEBHOOK] Credited ${coins} coins to user ${userId} | Event=${eventId}`);

            // Send email confirmation (fire and forget — don't block webhook response)
            const toEmail = metadata.userEmail || (userUpdate ? userUpdate.email : null);
            const toName = metadata.userName || (userUpdate ? userUpdate.username : 'Backer');

            if (toEmail) {
                sendPaymentConfirmationEmail({
                    toEmail,
                    toName,
                    coins,
                    amount: coins, // 1 coin = 1 SAR
                    projectTitle: metadata.projectTitle || null,
                    projectPid: metadata.projectPid || null,
                    transactionId: eventId
                }).catch(e => console.error('[EMAIL] async error:', e.message));
            }

            eventLog.status = 'processed';
            await eventLog.save();
        } catch (error) {
            console.error('[WEBHOOK] Processing failure:', error.message);
            eventLog.status = 'failed';
            eventLog.errorMessage = error.message;
            await eventLog.save();
            // Return 200 so Stripe stops retrying, but we've logged the failure
            return res.status(200).json({ received: true, error: 'processing_failed' });
        }
    } else {
        // Other events ignored
        eventLog.status = 'ignored';
        await eventLog.save();
    }

    console.log(`stripe_webhook: type=${eventType} eventId=${eventId} sessionId=${event.data.object.id} status=${eventLog.status}`);
    res.json({ received: true });
};

// @desc    Stripe webhook to confirm payment
// @route   POST /api/coins/webhook
// @access  Public (Stripe signature verified)
router.post('/webhook', handleStripeWebhook);

// @desc    Confirm purchase (called by frontend after successful checkout)
// @route   POST /api/coins/confirm-purchase
// @access  Private
router.post('/confirm-purchase', protect, async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({ success: false, message: 'Payment service not configured' });
        }

        const { sessionId } = req.body;

        if (!sessionId || typeof sessionId !== 'string') {
            return res.status(400).json({ success: false, message: 'Valid session ID required' });
        }

        // Verify session with Stripe first to ensure it's valid and paid
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== 'paid' || session.metadata.userId !== req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'Payment verification failed' });
        }

        const coinAmount = parseInt(session.metadata.coinAmount);

        // IDEMPOTENT: Try to find and update pending transaction
        const transaction = await Transaction.findOneAndUpdate(
            { stripeSessionId: sessionId, status: 'pending' },
            {
                status: 'completed',
                stripePaymentId: session.payment_intent
            },
            { new: true }
        );

        if (transaction) {
            // Coins already credited by webhook — just mark transaction and return balance
            const user = await User.findById(req.user._id).select('coinBalance');
            return res.json({
                success: true,
                message: 'Purchase confirmed!',
                balance: user.coinBalance
            });
        } else {
            // Transaction was already completed (likely by webhook)
            const user = await User.findById(req.user._id).select('coinBalance');
            return res.json({
                success: true,
                message: 'Purchase already confirmed',
                balance: user.coinBalance
            });
        }

    } catch (error) {
        console.error('Confirm purchase error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Send coins to a project (back a project)
// @route   POST /api/coins/send
// @access  Private
router.post('/send', protect, async (req, res) => {
    try {
        const { projectId, amount } = req.body;
        const coinAmount = parseInt(amount);

        if (!projectId || !coinAmount || coinAmount < 1 || isNaN(coinAmount)) {
            return res.status(400).json({ success: false, message: 'Project ID and valid amount required' });
        }

        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json({ success: false, message: 'Invalid project ID' });
        }

        // Find project and its creator
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        if (project.status !== 'active') {
            return res.status(400).json({ success: false, message: 'Project is not active' });
        }

        // Prevent self-backing
        if (project.creator.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'You cannot back your own project' });
        }

        // ATOMIC: Deduct coins only if balance is sufficient (single query, no race condition)
        const senderUpdate = await User.findOneAndUpdate(
            { _id: req.user._id, coinBalance: { $gte: coinAmount } },
            { $inc: { coinBalance: -coinAmount, totalSpent: coinAmount } },
            { new: true }
        );

        if (!senderUpdate) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient balance.'
            });
        }

        // Credit creator (atomic)
        await User.findByIdAndUpdate(project.creator, {
            $inc: { coinBalance: coinAmount, totalEarned: coinAmount }
        });

        // Update project funding (atomic)
        await Project.findByIdAndUpdate(projectId, {
            $inc: { currentAmount: coinAmount }
        });

        // Create transaction record
        await Transaction.create({
            type: 'send',
            from: req.user._id,
            to: project.creator,
            project: projectId,
            amount: coinAmount,
            status: 'completed',
            description: `Backed "${project.title}" with ${coinAmount} coins`
        });

        res.json({
            success: true,
            message: `Successfully sent ${coinAmount} coins to "${project.title}"!`,
            balance: senderUpdate.coinBalance
        });
    } catch (error) {
        console.error('Send coins error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Request cashout (project creators)
// @route   POST /api/coins/cashout
// @access  Private
router.post('/cashout', protect, async (req, res) => {
    try {
        const { amount } = req.body;
        const coinAmount = parseInt(amount);

        if (!coinAmount || coinAmount < 100 || isNaN(coinAmount)) {
            return res.status(400).json({ success: false, message: 'Minimum cashout is 100 coins (100 SAR)' });
        }

        const user = await User.findById(req.user._id);

        if (!user.bankAccount || !user.bankAccount.iban) {
            return res.status(400).json({
                success: false,
                message: 'Please add your bank account details in Settings before cashing out.'
            });
        }

        // ATOMIC: Deduct coins only if balance is sufficient
        const updatedUser = await User.findOneAndUpdate(
            { _id: req.user._id, coinBalance: { $gte: coinAmount } },
            { $inc: { coinBalance: -coinAmount, totalSpent: coinAmount } },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(400).json({
                success: false,
                message: `Insufficient balance. You have ${user.coinBalance} coins.`
            });
        }

        // Calculate fees: 8% processing + 6% bank = 14% total
        const processingFee = Math.ceil(coinAmount * 0.08);
        const bankFee = Math.ceil(coinAmount * 0.06);
        const totalFee = processingFee + bankFee;
        const netAmount = coinAmount - totalFee;

        // Create cashout transaction
        await Transaction.create({
            type: 'cashout',
            from: req.user._id,
            amount: coinAmount,
            fee: totalFee,
            netAmount: netAmount,
            status: 'pending',
            description: `Cashout ${coinAmount} coins → ${netAmount} SAR (${totalFee} SAR fees: ${processingFee} processing + ${bankFee} bank)`
        });

        res.json({
            success: true,
            message: `Cashout request submitted! ${netAmount} SAR will be transferred to your bank account.`,
            details: {
                grossAmount: coinAmount,
                processingFee,
                bankFee,
                totalFee,
                netAmount
            },
            balance: updatedUser.coinBalance
        });
    } catch (error) {
        console.error('Cashout error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Get projects the user has backed (with amount backed per project)
// @route   GET /api/coins/backed
// @access  Private
router.get('/backed', protect, async (req, res) => {
    try {
        const sends = await Transaction.find({
            from: req.user._id,
            type: 'send',
            status: 'completed',
            project: { $exists: true, $ne: null }
        })
            .populate('project')
            .sort({ createdAt: -1 });

        const byProject = new Map();
        sends.forEach(t => {
            if (!t.project) return;
            const id = t.project._id.toString();
            if (!byProject.has(id)) {
                byProject.set(id, { project: t.project, totalBacked: 0, lastBackedAt: t.createdAt });
            }
            const entry = byProject.get(id);
            entry.totalBacked += t.amount;
            if (t.createdAt > entry.lastBackedAt) entry.lastBackedAt = t.createdAt;
        });
        const data = Array.from(byProject.values());
        res.json({ success: true, data });
    } catch (error) {
        console.error('Backed projects error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Get transaction history
// @route   GET /api/coins/history
// @access  Private
router.get('/history', protect, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Cap at 100
        const skip = (page - 1) * limit;

        const transactions = await Transaction.find({
            $or: [{ from: req.user._id }, { to: req.user._id }],
            status: { $ne: 'failed' }
        })
            .populate('from', 'username')
            .populate('to', 'username')
            .populate('project', 'title')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Transaction.countDocuments({
            $or: [{ from: req.user._id }, { to: req.user._id }],
            status: { $ne: 'failed' }
        });

        res.json({
            success: true,
            data: transactions,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('History fetch error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Update bank account details
// @route   PUT /api/coins/bank-account
// @access  Private
router.put('/bank-account', protect, async (req, res) => {
    try {
        const { accountName, iban, bankName } = req.body;

        if (!accountName || !iban || !bankName) {
            return res.status(400).json({ success: false, message: 'All bank account fields are required' });
        }

        // Basic IBAN validation (Saudi IBANs start with SA and are 24 chars)
        const cleanIban = iban.replace(/\s/g, '').toUpperCase();
        if (!/^SA\d{22}$/.test(cleanIban)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid Saudi IBAN (starts with SA, 24 characters)' });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            {
                bankAccount: {
                    accountName: accountName.trim(),
                    iban: cleanIban,
                    bankName: bankName.trim()
                }
            },
            { new: true }
        ).select('bankAccount');

        res.json({ success: true, bankAccount: user.bankAccount });
    } catch (error) {
        console.error('Bank account update error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Get Stripe integration health
// @route   GET /api/coins/health
// @access  Public
router.get('/health', (req, res) => {
    res.json({
        ok: true,
        stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
        webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
        timestamp: new Date().toISOString()
    });
});

// @desc    Get coin transaction history (Audit Trail)
// @route   GET /api/coins/transactions
// @access  Private
router.get('/transactions', protect, async (req, res) => {
    try {
        const userId = req.query.userId || req.user._id;

        // Security: Self or Admin/Employee only
        const isAuthUser = userId.toString() === req.user._id.toString();
        const isAdmin = ['admin', 'employee', 'manager'].includes(req.user.role);

        if (!isAuthUser && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Unauthorized access to transaction logs' });
        }

        const transactions = await CoinTransaction.find({ userId })
            .sort({ createdAt: -1 })
            .limit(20);

        res.json({
            success: true,
            count: transactions.length,
            data: transactions
        });
    } catch (error) {
        console.error('Transactions audit fetch error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = { router, handleStripeWebhook };
