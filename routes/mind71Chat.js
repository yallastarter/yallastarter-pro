const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const Mind71Conversation = require('../models/Mind71Conversation');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Rate limiter for chat endpoint
const chatLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 requests per windowMs
    message: { success: false, message: 'Too many requests, please try again later.' }
});

// Optional Auth Middleware for Mind71
const getUserOptional = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const uid = decoded.userId || decoded.id;
            req.user = await User.findById(uid).select('-password');
        } catch (error) {
            // Silence error, continue as anonymous
        }
    }
    next();
};

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
 * GET /api/mind71/conversations
 * List threads for logged-in user
 */
router.get('/conversations', getUserOptional, async (req, res) => {
    try {
        if (!req.user) {
            return res.json({ success: true, conversations: [] });
        }
        const conversations = await Mind71Conversation.find({ userId: req.user._id })
            .select('conversationId title lastActivity language')
            .sort({ lastActivity: -1 })
            .limit(50);
        res.json({ success: true, conversations });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
    }
});

/**
 * GET /api/mind71/conversation/:id
 * Get history for a specific thread
 */
router.get('/conversation/:id', getUserOptional, async (req, res) => {
    try {
        const query = { conversationId: req.params.id };
        if (req.user) {
            query.userId = req.user._id;
        }

        const chat = await Mind71Conversation.findOne(query);
        if (!chat) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }
        res.json({ success: true, messages: chat.messages, title: chat.title });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch history' });
    }
});

router.post('/chat', chatLimiter, getUserOptional, async (req, res) => {
    try {
        const { message, lang = 'en', conversationId } = req.body;

        if (!process.env.OPENROUTER_API_KEY) {
            return res.status(500).json({ success: false, message: "OpenRouter key missing" });
        }

        if (!message || message.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }

        const primaryModel = process.env.MIND71_MODEL || "z-ai/glm-4.5-air:free";
        const referer = process.env.BASE_URL || "https://www.yallastarter.com";

        // 1. Load or Create Conversation
        let chat;
        let currentConvId = conversationId;

        if (currentConvId) {
            const query = { conversationId: currentConvId };
            if (req.user) query.userId = req.user._id;
            chat = await Mind71Conversation.findOne(query);
        }

        if (!chat) {
            currentConvId = currentConvId || uuidv4();
            chat = new Mind71Conversation({
                conversationId: currentConvId,
                language: lang,
                messages: [{ role: 'system', content: SYSTEM_PROMPTS[lang] || SYSTEM_PROMPTS.en }]
            });
            if (req.user) chat.userId = req.user._id;
        }

        // 2. Generate Title if needed
        const userMsgCount = chat.messages.filter(m => m.role === 'user').length;
        if (userMsgCount === 0 || chat.title === 'New Strategy') {
            const cleanTitle = message.trim().split(/\s+/).slice(0, 6).join(' ');
            chat.title = cleanTitle + (message.split(/\s+/).length > 6 ? '...' : '');
        }

        // 3. Append User Message
        chat.messages.push({ role: 'user', content: message });

        // 4. Prepare Context (System + last 24 messages)
        const messagesForAI = [
            chat.messages[0], // System
            ...chat.messages.slice(1).slice(-24)
        ];

        // 5. Call OpenRouter
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": referer,
                "X-Title": "YallaStarter Mind71"
            },
            body: JSON.stringify({
                model: primaryModel,
                messages: messagesForAI.map(m => ({ role: m.role, content: m.content })),
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errData = await response.text();
            return res.status(response.status).json({ success: false, message: "AI error", details: errData });
        }

        const data = await response.json();
        const reply = data.choices[0].message.content;

        // 6. Save Reply
        chat.messages.push({ role: 'assistant', content: reply });
        chat.lastActivity = new Date();
        await chat.save();

        res.json({ success: true, reply, conversationId: currentConvId, title: chat.title });

    } catch (error) {
        console.error('[MIND71] Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.post('/chat-stream', chatLimiter, getUserOptional, async (req, res) => {
    const abortController = new AbortController();

    try {
        const { message, lang = 'en', conversationId } = req.body;

        if (!process.env.OPENROUTER_API_KEY) {
            return res.status(500).json({ success: false, message: "API key missing" });
        }

        if (!message || message.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }

        const primaryModel = process.env.MIND71_MODEL || "z-ai/glm-4.5-air:free";
        const referer = process.env.BASE_URL || "https://www.yallastarter.com";

        let chat;
        let currentConvId = conversationId;

        if (currentConvId) {
            const query = { conversationId: currentConvId };
            if (req.user) query.userId = req.user._id;
            chat = await Mind71Conversation.findOne(query);
        }

        if (!chat) {
            currentConvId = currentConvId || uuidv4();
            chat = new Mind71Conversation({
                conversationId: currentConvId,
                language: lang,
                messages: [{ role: 'system', content: SYSTEM_PROMPTS[lang] || SYSTEM_PROMPTS.en }]
            });
            if (req.user) chat.userId = req.user._id;
        }

        // Title logic
        const userMsgCount = chat.messages.filter(m => m.role === 'user').length;
        if (userMsgCount === 0 || chat.title === 'New Strategy') {
            const cleanTitle = message.trim().split(/\s+/).slice(0, 6).join(' ');
            chat.title = cleanTitle + (message.split(/\s+/).length > 6 ? '...' : '');
        }

        chat.messages.push({ role: 'user', content: message });
        const messagesForAI = [chat.messages[0], ...chat.messages.slice(1).slice(-24)];

        // Configure SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        // Send metadata first
        res.write(`data: ${JSON.stringify({ metadata: { conversationId: currentConvId, title: chat.title } })}\n\n`);

        const openrouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": referer,
                "X-Title": "YallaStarter Mind71"
            },
            body: JSON.stringify({
                model: primaryModel,
                messages: messagesForAI.map(m => ({ role: m.role, content: m.content })),
                stream: true,
                temperature: 0.7
            }),
            signal: abortController.signal
        });

        if (!openrouterResponse.ok) {
            const errText = await openrouterResponse.text();
            res.write(`data: ${JSON.stringify({ error: "AI Intelligence unreachable", details: errText })}\n\n`);
            return res.end();
        }

        const reader = openrouterResponse.body.getReader();
        const decoder = new TextDecoder();
        let fullReply = "";
        let partialLine = "";

        req.on('close', () => {
            abortController.abort();
            reader.cancel();
        });

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });

            // OpenRouter sends SSE, we need to parse and re-emit in our format
            const lines = (partialLine + chunk).split('\n');
            partialLine = lines.pop(); // save incomplete line for next chunk

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.slice(6).trim();
                    if (dataStr === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(dataStr);
                        const delta = parsed.choices[0]?.delta?.content || "";
                        if (delta) {
                            fullReply += delta;
                            res.write(`data: ${JSON.stringify({ delta })}\n\n`);
                        }
                    } catch (e) {
                        // Skip malformed JSON
                    }
                }
            }
        }

        if (fullReply) {
            chat.messages.push({ role: 'assistant', content: fullReply });
            chat.lastActivity = new Date();
            await chat.save();
        }

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('[MIND71] Stream aborted by client');
        } else {
            console.error('[MIND71] Stream Error:', error);
            res.write(`data: ${JSON.stringify({ error: "Intelligence sync interrupted" })}\n\n`);
        }
        res.end();
    }
});

// Create new chat
router.post('/new', (req, res) => {
    res.json({ success: true, conversationId: uuidv4() });
});

module.exports = router;
