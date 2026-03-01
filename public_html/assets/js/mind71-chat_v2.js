/**
 * Mind71 AI - Main Orchestrator
 */

import store from './conversationStore.js';
import SidebarManager from './sidebarManager.js';
import ChatLayout from './chatLayout.js';

class Mind71Platform {
    constructor() {
        console.log("mind71 chat loaded");
        this.layout = new ChatLayout();
        this.sidebar = new SidebarManager({
            onChatSelect: (id) => this.switchChat(id)
        });

        this.init();
    }

    init() {
        const input = document.querySelector('#main-input');
        const sendBtn = document.querySelector('.btn-send-glow');

        // Textarea auto-resize
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = input.scrollHeight + 'px';
        });

        // Send events
        sendBtn.addEventListener('click', () => this.handleSend());
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });

        // Load initial state
        const activeId = store.getActiveId();
        if (activeId && store.get(activeId)) {
            this.switchChat(activeId);
        } else if (store.chats.length > 0) {
            this.switchChat(store.chats[0].id);
        } else {
            this.sidebar.newChatBtn.click();
        }
    }

    switchChat(id) {
        if (!id) {
            this.layout.renderMessages([]);
            return;
        }
        store.setActiveId(id);
        const chat = store.get(id);
        this.layout.renderMessages(chat.messages);
        this.sidebar.render();
    }

    async handleSend() {
        const input = document.querySelector('#main-input');
        const text = input.value.trim();
        console.log("send clicked", text);
        if (!text || this.layout.isTyping) return;

        const chatId = store.getActiveId();
        const chat = store.get(chatId);
        if (!chat) return;

        // 1. Process User Message
        this.layout.addMessageToUI(text, 'user');
        chat.messages.push({ role: 'user', content: text });

        // Auto-title strategy
        if (chat.title === 'New Strategy') {
            chat.title = text.substring(0, 30) + (text.length > 30 ? '...' : '');
            this.sidebar.render();
        }

        this.layout.resetInput();
        this.layout.setThinking(true);

        // CREATE INSTANT AI BUBBLE
        let assistantMessage = "";
        let currentMessageBox = this.layout.addMessageToUI("", 'ai');
        let currentMessageRow = currentMessageBox.closest('.message-row');

        // Abort Controller for "Stop generating"
        this.abortController = new AbortController();
        const stopBtn = document.querySelector('#stop-generation');
        const abortHandler = () => {
            if (this.abortController) {
                this.abortController.abort();
            }
        };

        if (stopBtn) {
            stopBtn.addEventListener('click', abortHandler);
        }

        try {
            console.log("calling /api/mind71/chat-stream");
            const response = await fetch('/api/mind71/chat-stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    conversationId: chatId,
                    lang: document.documentElement.lang || 'en'
                }),
                signal: this.abortController.signal
            });

            if (!response.ok) {
                const errText = await response.text().catch(() => "Unknown Connection Error");
                let errMsg = `System Error ${response.status}`;
                try {
                    const errData = JSON.parse(errText);
                    errMsg = errData.message || errMsg;
                } catch (e) {
                    if (errText.length < 100) errMsg = errText;
                }
                throw new Error(errMsg);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6).trim();
                        if (dataStr === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(dataStr);

                            if (parsed.error) {
                                console.error("Stream Error:", parsed);
                                throw new Error(parsed.error);
                            }

                            if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
                                const content = parsed.choices[0].delta.content || "";
                                if (content) {
                                    if (currentMessageRow.classList.contains('typing')) {
                                        currentMessageRow.classList.remove('typing');
                                    }
                                    assistantMessage += content;

                                    // Real-time UI update
                                    if (typeof marked !== 'undefined') {
                                        currentMessageBox.innerHTML = marked.parse(assistantMessage);
                                        currentMessageBox.querySelectorAll('pre code').forEach((block) => {
                                            if (typeof hljs !== 'undefined') hljs.highlightElement(block);
                                        });
                                    } else {
                                        currentMessageBox.textContent = assistantMessage;
                                    }
                                    this.layout.scrollToBottom();
                                }
                            }
                        } catch (e) {
                            if (e instanceof SyntaxError) continue;
                            throw e;
                        }
                    }
                }
            }

            // Save final message to history
            if (assistantMessage) {
                chat.messages.push({ role: 'assistant', content: assistantMessage });
            }

        } catch (err) {
            currentMessageRow.classList.remove('typing');
            if (err.name === 'AbortError') {
                console.log('Generation stopped by user');
                if (!assistantMessage) {
                    currentMessageBox.innerHTML = `<span style="opacity:0.5; font-style:italic;">Generation halted.</span>`;
                }
            } else {
                console.error('System Failure:', err);
                currentMessageBox.innerHTML = `<div class="error-msg" style="color: #ef4444; font-size: 0.9rem;">
                    <i class="fa-solid fa-triangle-exclamation"></i> ${err.message}
                </div>`;
            }
        } finally {
            if (stopBtn) {
                stopBtn.removeEventListener('click', abortHandler);
            }
            this.abortController = null;
            this.layout.setThinking(false);
            store.save(); // Persist history
        }
    }
}


// Spark the platform
document.addEventListener('DOMContentLoaded', () => {
    window.MIND71 = new Mind71Platform();
});
