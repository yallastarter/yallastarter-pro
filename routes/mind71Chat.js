const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const Mind71Chat = require('../models/Mind71Chat');
const { v4: uuidv4 } = require('uuid');

// Rate limiter for chat endpoint
const chatLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 requests per windowMs
    message: { success: false, message: 'Too many requests, please try again later.' }
});

// System Prompts
const SYSTEM_PROMPTS = {
    en: `You are MIND71, a premier Saudi-focused business intelligence advisor aligned with Saudi Vision 2030. 
    Your role is to help "creators" (project owners) and "backers" (investors) succeed on YallaStarter.
    - Use "creator" and "backer" language. Never use "donation" or "charity" terms.
    - Be professional, culturally aware, and supportive of Saudi innovation.
    - Focus on GEA (General Entertainment Authority) guidelines and Vision 2030 goals.
    - Do not hallucinate laws or regulations. If unsure, ask for more details or suggest consulting official Saudi channels.
    - Keep responses concise and actionable.`,
    ar: `أنت MIND71، مستشار ذكاء الأعمال الأول المتخصص في الشأن السعودي والمتوافق مع رؤية السعودية 2030.
    دورك هو مساعدة "المبدعين" (أصحاب المشاريع) و"الداعمين" (المستثمرين) على النجاح في يلا ستارتر.
    - استخدم مصطلحات "المبدع" و"الداعم". لا تستخدم أبداً مصطلحات "تبرع" أو "صدقة".
    - كن مهنياً، واعياً بالثقافة السعودية، وداعماً للابتكار السعودي.
    - ركز على إرشادات الهيئة العامة للترفيه (GEA) وأهداف رؤية 2030.
    - لا تقم بتأليف قوانين أو لوائح. إذا لم تكن متأكداً، اطلب مزيداً من التفاصيل أو اقترح استشارة القنوات السعودية الرسمية.
    - اجعل ردودك موجزة وعملية.`
};

/**
 * GET /api/mind71/health
 * Diagnostic endpoint for Render environment verification
 */
router.get('/health', (req, res) => {
    res.json({
        ok: true,
        nodeEnv: process.env.NODE_ENV,
        openrouterKeySet: !!process.env.OPENROUTER_API_KEY,
        mind71Model: process.env.MIND71_MODEL || null,
        baseUrl: process.env.BASE_URL || process.env.CLIENT_URL || null
    });
});

router.post('/chat', chatLimiter, async (req, res) => {
    try {
        const { message, lang = 'en', conversationId } = req.body;

        // Validation for missing API Key
        if (!process.env.OPENROUTER_API_KEY) {
            console.error('MIND71 ERROR: OPENROUTER_API_KEY not configured');
            return res.status(500).json({
                success: false,
                message: "OPENROUTER_API_KEY not configured"
            });
        }

        // Message Validation
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }
        if (message.length > 2000) {
            return res.status(400).json({ success: false, message: 'Message exceeds 2000 characters limit' });
        }

        const apiKey = process.env.OPENROUTER_API_KEY;
        const model = process.env.MIND71_MODEL || "deepseek/deepseek-r1-distill-qwen-1.5b";
        const referer = process.env.BASE_URL || process.env.CLIENT_URL || "https://yallastarter-pro.onrender.com";

        // Debug logging (prefix only, never full key)
        const keyPrefix = apiKey ? `${apiKey.substring(0, 7)}...` : 'not set';
        console.log(`[mind71] keySet=${!!apiKey} prefix=${keyPrefix} model=${model} len=${message.length}`);

        // Handle conversation persistence
        let chat;
        let currentConvId = conversationId;

        if (currentConvId) {
            chat = await Mind71Chat.findOne({ conversationId: currentConvId });
        }

        if (!chat) {
            currentConvId = uuidv4();
            chat = new Mind71Chat({
                conversationId: currentConvId,
                language: lang,
                messages: [{ role: 'system', content: SYSTEM_PROMPTS[lang] || SYSTEM_PROMPTS.en }]
            });
            if (req.user) chat.userId = req.user.id;
        }

        // Add user message to history
        chat.messages.push({ role: 'user', content: message });

        // Keep conversation window (max 25 messages)
        if (chat.messages.length > 25) {
            const systemPrompt = chat.messages[0];
            const recentMessages = chat.messages.slice(-24);
            chat.messages = [systemPrompt, ...recentMessages];
        }

        // Call OpenRouter
        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": referer,
                    "X-Title": "YallaStarter Mind71"
                },
                body: JSON.stringify({
                    model: model,
                    messages: chat.messages.map(m => ({ role: m.role, content: m.content })),
                    temperature: 0.7
                })
            });

            console.log(`[MIND71] OpenRouter Status: ${response.status}`);

            if (!response.ok) {
                const errorData = await response.text();
                const trimmedError = errorData.substring(0, 500);
                console.error(`[MIND71] Provider Error (${response.status}):`, trimmedError);

                if (response.status === 401) {
                    return res.status(401).json({
                        success: false,
                        message: "OpenRouter authentication failed (401). Check OPENROUTER_API_KEY in Render.",
                        providerStatus: 401
                    });
                }

                return res.status(502).json({
                    success: false,
                    message: "AI provider error",
                    providerStatus: response.status
                });
            }

            const data = await response.json();
            const reply = data.choices[0].message.content;

            // Add assistant reply and save
            chat.messages.push({ role: 'assistant', content: reply });
            chat.lastActivity = new Date();
            await chat.save();

            res.json({
                success: true,
                reply: reply,
                conversationId: currentConvId
            });

        } catch (apiError) {
            console.error('[MIND71] Fetch Exception:', apiError.message);
            res.status(502).json({
                success: false,
                message: lang === 'ar' ? 'خطأ في الاتصال بمزود الخدمة' : 'AI Service communication error'
            });
        }

    } catch (error) {
        console.error('[MIND71] Internal Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Create new chat
router.post('/new', (req, res) => {
    res.json({ success: true, conversationId: uuidv4() });
});

module.exports = router;
