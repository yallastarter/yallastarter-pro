const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Project = require('../models/Project');
const Transaction = require('../models/Transaction');
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
                type: 'coin_purchase'
            },
            customer_email: req.user.email
        });

        // Create pending transaction
        await Transaction.create({
            type: 'purchase',
            from: req.user._id,
            amount: coinAmount,
            stripeSessionId: session.id,
            status: 'pending',
            description: `Purchase of ${coinAmount} coins`
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

// @desc    Stripe webhook to confirm payment
// @route   POST /api/coins/webhook
// @access  Public (Stripe signature verified)
router.post('/webhook', async (req, res) => {
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

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        if (session.metadata && session.metadata.type === 'coin_purchase') {
            const userId = session.metadata.userId;
            const coinAmount = parseInt(session.metadata.coinAmount);

            try {
                // IDEMPOTENT: Only update if status is 'pending'
                const transaction = await Transaction.findOneAndUpdate(
                    { stripeSessionId: session.id, status: 'pending' },
                    {
                        status: 'completed',
                        stripePaymentId: session.payment_intent
                    },
                    { new: true }
                );

                if (transaction) {
                    // Credit coins — coinBalance goes up, this is a purchase not earnings
                    await User.findByIdAndUpdate(userId, {
                        $inc: { coinBalance: coinAmount }
                    });
                    console.log(`✅ Webhook: Credited ${coinAmount} coins to user ${userId}`);
                } else {
                    console.log(`ℹ️ Webhook: Transaction ${session.id} already processed or not found.`);
                }
            } catch (error) {
                console.error('Webhook processing error:', error);
            }
        }
    }

    res.json({ received: true });
});

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

module.exports = router;
