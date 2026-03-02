const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Project = require('../models/Project');
const Transaction = require('../models/Transaction');
const StripeEventLog = require('../models/StripeEventLog');
const CoinTransaction = require('../models/CoinTransaction');
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');

// Initialize Stripe only if key is available
let stripe;
if (process.env.STRIPE_SECRET_KEY) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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

        const { amount } = req.body;
        const coinAmount = parseInt(amount);

        if (!coinAmount || coinAmount < 1 || isNaN(coinAmount)) {
            return res.status(400).json({ success: false, message: 'Minimum purchase is 1 coin' });
        }

        if (coinAmount > 100000) {
            return res.status(400).json({ success: false, message: 'Maximum purchase is 100,000 coins per transaction' });
        }

        // 1 coin = 1 SAR — Stripe uses halalas (smallest unit), 1 SAR = 100 halalas
        const amountInHalalas = coinAmount * 100;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'sar',
                    product_data: {
                        name: `${coinAmount} YallaStarter Coins`,
                        description: `Purchase ${coinAmount} coins for your YallaStarter wallet. 1 coin = 1 SAR. No refunds.`,
                        images: []
                    },
                    unit_amount: amountInHalalas,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${process.env.CLIENT_URL || req.headers.origin}/coins.html?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL || req.headers.origin}/coins.html?purchase=cancelled`,
            metadata: {
                userId: req.user._id.toString(),
                coinAmount: coinAmount.toString(),
                coins: coinAmount.toString(),
                currency: 'sar',
                amountMinor: amountInHalalas.toString(),
                type: 'coin_purchase'
            },
            client_reference_id: req.user._id.toString(),
            customer_email: req.user.email
        });

        // Create pending legacy transaction for backward compatibility (optional)
        await Transaction.create({
            type: 'purchase',
            from: req.user._id,
            amount: coinAmount,
            stripeSessionId: session.id,
            status: 'pending',
            description: `Purchase of ${coinAmount} coins (v1.0.2 audit active)`
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
            metadata: { initial: true }
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

        if (!metadata || !metadata.userId || !metadata.coins) {
            console.error(`[WEBHOOK] Missing metadata for session ${session.id}`);
            eventLog.status = 'failed';
            eventLog.errorMessage = 'Missing metadata (userId/coins)';
            await eventLog.save();
            return res.status(200).json({ received: true, error: 'missing_metadata' });
        }

        const userId = metadata.userId;
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
            const userUpdate = await User.findByIdAndUpdate(userId, {
                $inc: { coinBalance: coins }
            }, { new: true });

            if (!userUpdate) throw new Error(`User ${userId} not found`);

            // Create success audit record
            await CoinTransaction.findOneAndUpdate(
                { stripeSessionId: session.id, type: 'coin_purchase' },
                {
                    userId,
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
                { status: 'completed', stripePaymentId: session.payment_intent },
                { new: true }
            );

            console.log(`[WEBHOOK] Credited ${coins} coins to user ${userId} | Event=${eventId}`);

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
            // Credit coins — purchase, not earnings
            await User.findByIdAndUpdate(req.user._id, {
                $inc: { coinBalance: coinAmount }
            });

            const user = await User.findById(req.user._id).select('coinBalance');
            return res.json({
                success: true,
                message: `${coinAmount} coins added to your wallet!`,
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
