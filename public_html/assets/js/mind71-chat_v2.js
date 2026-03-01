/**
 * Mind71 AI - Main Orchestrator
 */

import store from './conversationStore.js';
import SidebarManager from './sidebarManager.js';
import ChatLayout from './chatLayout.js';

class Mind71Platform {
    constructor() {
        this.layout = new ChatLayout();
        this.sidebar = new SidebarManager({
            onChatSelect: (id) => this.switchChat(id)
        });

        this.init();
    }

    init() {
        const input = document.querySelector('#main-input');
        const sendBtn = document.querySelector('.btn-send-glow');
        const stopBtn = document.querySelector('#stop-generating');

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

        // Stop button
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.handleStop());
        }

        this.abortController = null;

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

    handleStop() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
            this.layout.setThinking(false);
        }
    }

    async handleSend() {
        const input = document.querySelector('#main-input');
        const text = input.value.trim();
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

        this.abortController = new AbortController();

        try {
            // Try Streaming First
            const response = await fetch('/api/mind71/chat/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: this.abortController.signal,
                body: JSON.stringify({
                    message: text,
                    conversationId: chatId,
                    lang: document.documentElement.lang || 'en'
                })
            });

            if (!response.ok) throw new Error('Stream request failed');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullContent = "";
            let streamingBox = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6).trim();
                        if (dataStr === '[DONE]') break;

                        try {
                            const data = JSON.parse(dataStr);

                            if (data.conversationId && !streamingBox) {
                                // First chunk often has the confirm
                                streamingBox = this.layout.createStreamingBox();
                                continue;
                            }

                            if (data.content) {
                                if (!streamingBox) streamingBox = this.layout.createStreamingBox();
                                fullContent += data.content;
                                this.layout.updateStreamingBox(streamingBox, fullContent);
                            }

                            if (data.error) {
                                throw new Error(data.error);
                            }
                        } catch (e) {
                            // Skip parse errors for partial chunks
                        }
                    }
                }
            }

            if (fullContent) {
                chat.messages.push({ role: 'assistant', content: fullContent });
            }

        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Generation stopped by user');
                return;
            }

            console.warn('Streaming failed, falling back to standard POST:', err);

            // Fallback to old POST route
            try {
                const response = await fetch('/api/mind71/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: this.abortController.signal,
                    body: JSON.stringify({
                        message: text,
                        conversationId: chatId,
                        lang: document.documentElement.lang || 'en'
                    })
                });

                const data = await response.json();

                if (data.success) {
                    chat.messages.push({ role: 'assistant', content: data.reply });
                    this.layout.addMessageToUI(data.reply, 'assistant');
                } else {
                    const errStatus = data.providerStatus ? ` (Status: ${data.providerStatus})` : "";
                    this.layout.addMessageToUI(`Intelligence Failure${errStatus}: ${data.message}`, 'ai');
                }
            } catch (fallbackErr) {
                if (fallbackErr.name === 'AbortError') return;
                console.error('System Failure:', fallbackErr);
                this.layout.addMessageToUI("Intelligence link severed. Check connection and retry.", 'ai');
            }
        } finally {
            this.layout.setThinking(false);
            this.abortController = null;
            store.save(); // Persist history
        }
    }
}

// Spark the platform
document.addEventListener('DOMContentLoaded', () => {
    window.MIND71 = new Mind71Platform();
});
