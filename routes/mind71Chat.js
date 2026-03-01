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
        openrouterKeyPrefix: (process.env.OPENROUTER_API_KEY || "").slice(0, 8),
        mind71Model: process.env.MIND71_MODEL || null,
        baseUrl: process.env.BASE_URL || null,
        clientUrl: process.env.CLIENT_URL || null
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
                message: "OPENROUTER_API_KEY not configured in Render env vars"
            });
        }

        // Message Validation
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }
        if (message.length > 2000) {
            return res.status(400).json({ success: false, message: 'Message exceeds 2000 characters limit' });
        }

        const primaryModel = process.env.MIND71_MODEL || "deepseek/deepseek-r1-distill-qwen-1.5b";
        const fallbackModels = [
            "z-ai/glm-4.5-air:free",
            "stepfun/step-3.5-flash:free",
            "nvidia/nemotron-nano-9b-v2:free"
        ];

        // Final list of models to try
        const modelsToTry = [primaryModel, ...fallbackModels.filter(m => m !== primaryModel)];

        const referer = process.env.BASE_URL || process.env.CLIENT_URL || "https://www.yallastarter.com";

        // Diagnostic logs
        console.log("[mind71] route hit");
        console.log("[mind71] keySet=", !!process.env.OPENROUTER_API_KEY,
            "keyPrefix=", (process.env.OPENROUTER_API_KEY || "").slice(0, 8),
            "primaryModel=", primaryModel);

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

        // Call OpenRouter with fallbacks
        let lastError = null;
        let successfulReply = null;

        for (const model of modelsToTry) {
            try {
                console.log(`[mind71] attempting completion with model: ${model}`);
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

                if (response.ok) {
                    const data = await response.json();
                    successfulReply = data.choices[0].message.content;
                    console.log(`[mind71] success with model: ${model}`);
                    break; // Exit loop on success
                } else {
                    const errorData = await response.text();
                    console.log(`[mind71] model ${model} failed - status: ${response.status} body: ${errorData.slice(0, 500)}`);

                    if (response.status === 401) {
                        return res.status(401).json({
                            success: false,
                            message: "OpenRouter auth failed (401). Verify OPENROUTER_API_KEY in Render and redeploy.",
                            providerStatus: 401
                        });
                    }
                    lastError = { status: response.status, body: errorData.slice(0, 500) };
                }
            } catch (err) {
                console.error(`[mind71] fetch exception with model ${model}:`, err.message);
                lastError = { status: 502, body: err.message };
            }
        }

        if (successfulReply) {
            // Add assistant reply and save
            chat.messages.push({ role: 'assistant', content: successfulReply });
            chat.lastActivity = new Date();
            await chat.save();

            return res.json({
                success: true,
                reply: successfulReply,
                conversationId: currentConvId
            });
        } else {
            // All models failed
            return res.status(lastError?.status || 502).json({
                success: false,
                message: "AI provider error (all fallback models failed)",
                providerStatus: lastError?.status || 502,
                details: lastError?.body
            });
        }

    } catch (error) {
        console.error('[MIND71] Internal Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.post('/chat-stream', chatLimiter, async (req, res) => {
    try {
        const { message, lang = 'en', conversationId } = req.body;

        if (!process.env.OPENROUTER_API_KEY) {
            return res.status(500).json({ success: false, message: "API Key not configured" });
        }

        if (!message) return res.status(400).json({ success: false, message: "Message required" });

        const primaryModel = process.env.MIND71_MODEL || "deepseek/deepseek-r1-distill-qwen-1.5b";
        const referer = process.env.BASE_URL || process.env.CLIENT_URL || "https://www.yallastarter.com";

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

        chat.messages.push({ role: 'user', content: message });
        if (chat.messages.length > 25) {
            chat.messages = [chat.messages[0], ...chat.messages.slice(-24)];
        }

        // SSE Headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Initial metadata chunk
        res.write(`data: ${JSON.stringify({ metadata: { conversationId: currentConvId } })}\n\n`);

        const response = await fetch("https://openrouter.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": referer,
                "X-Title": "YallaStarter Mind71"
            },
            body: JSON.stringify({
                model: primaryModel,
                messages: chat.messages.map(m => ({ role: m.role, content: m.content })),
                stream: true,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error(`[MIND71] OpenRouter Error (${response.status}):`, errBody);

            let userFriendlyMessage = "Upstream Error";
            if (response.status === 401) userFriendlyMessage = "OpenRouter Auth Failed (Check API Key)";
            if (response.status === 402) userFriendlyMessage = "OpenRouter Credits Exhausted";
            if (response.status === 429) userFriendlyMessage = "OpenRouter Rate Limit Exceeded";

            res.write(`data: ${JSON.stringify({ error: userFriendlyMessage, details: errBody })}\n\n`);
            return res.end();
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullReply = "";

        // Handle client disconnect
        let isAborted = false;
        req.on('close', () => {
            isAborted = true;
            reader.cancel();
        });

        while (!isAborted) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            res.write(chunk);

            // Extract content for saving to DB
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.slice(6).trim();
                    if (dataStr === '[DONE]') continue;
                    try {
                        const parsed = JSON.parse(dataStr);
                        const content = parsed.choices[0]?.delta?.content || "";
                        fullReply += content;
                    } catch (e) { }
                }
            }
        }

        if (fullReply && !isAborted) {
            chat.messages.push({ role: 'assistant', content: fullReply });
            chat.lastActivity = new Date();
            await chat.save();
        }

        res.end();
    } catch (error) {
        console.error('[MIND71] Stream Error:', error);
        res.end();
    }
});

// Create new chat
router.post('/new', (req, res) => {
    res.json({ success: true, conversationId: uuidv4() });
});

module.exports = router;
