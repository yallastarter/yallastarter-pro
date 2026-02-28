const express = require('express');
const router = express.Router();
const axios = require('axios');
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

router.post('/chat', chatLimiter, async (req, res) => {
    try {
        const { message, lang = 'en', conversationId } = req.body;

        // Validation
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }
        if (message.length > 2000) {
            return res.status(400).json({ success: false, message: 'Message exceeds 2000 characters limit' });
        }

        const apiKey = process.env.OPENROUTER_API_KEY;
        const model = process.env.MIND71_MODEL || 'deepseek/deepseek-r1:free';

        if (!apiKey) {
            console.error('MIND71 ERROR: OPENROUTER_API_KEY not set');
            return res.status(500).json({ success: false, message: 'AI service is temporarily unavailable.' });
        }

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
            // Link to user if logged in (assuming req.user exists from auth middleware)
            if (req.user) chat.userId = req.user.id;
        }

        // Add user message to history
        chat.messages.push({ role: 'user', content: message });

        // Keep last 12 turns (24 messages including system prompt)
        if (chat.messages.length > 25) {
            // Keep system prompt + last 24 messages
            const systemPrompt = chat.messages[0];
            const recentMessages = chat.messages.slice(-24);
            chat.messages = [systemPrompt, ...recentMessages];
        }

        // Call OpenRouter
        try {
            const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: model,
                messages: chat.messages.map(m => ({ role: m.role, content: m.content })),
                temperature: 0.7,
                max_tokens: 1000
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://yallastarter.com',
                    'X-Title': 'YallaStarter Mind71',
                    'Content-Type': 'application/json'
                }
            });

            const reply = response.data.choices[0].message.content;

            // Add assistant reply to history
            chat.messages.push({ role: 'assistant', content: reply });
            chat.lastActivity = new Date();

            await chat.save();

            res.json({
                success: true,
                reply: reply,
                conversationId: currentConvId
            });

        } catch (apiError) {
            console.error('OpenRouter API Error:', apiError.response ? apiError.response.data : apiError.message);

            // Helpful fallback if API fails
            const errorMsg = lang === 'ar'
                ? 'عذراً، واجهت مشكلة في الاتصال بمزود الخدمة. يرجى المحاولة مرة أخرى لاحقاً.'
                : 'Sorry, I am having trouble connecting to my brain right now. Please try again later.';

            res.status(502).json({ success: false, message: errorMsg });
        }

    } catch (error) {
        console.error('Mind71 Internal Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Create new chat
router.post('/new', (req, res) => {
    res.json({ success: true, conversationId: uuidv4() });
});

module.exports = router;
