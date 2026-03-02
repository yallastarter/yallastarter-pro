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

    async init() {
        const input = document.querySelector('#main-input');
        const sendBtn = document.querySelector('.btn-send-glow');

        // Textarea auto-resize
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = input.scrollHeight + 'px';
        });

        // Mobile Scroll behavior
        input.addEventListener('focus', () => {
            if (window.innerWidth <= 768) {
                setTimeout(() => this.layout.scrollToBottom(), 300);
            }
        });

        // Mobile Sidebar Toggle
        const sidebarToggle = document.querySelector('.mobile-sidebar-toggle');
        const sidebarClose = document.querySelector('.sidebar-close-btn');
        const sidebarBackdrop = document.querySelector('.sidebar-backdrop');

        const toggleSidebar = (show) => {
            document.body.classList.toggle('sidebar-open', show);
        };

        if (sidebarToggle) sidebarToggle.addEventListener('click', () => toggleSidebar(true));
        if (sidebarClose) sidebarClose.addEventListener('click', () => toggleSidebar(false));
        if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', () => toggleSidebar(false));

        // Send events
        sendBtn.addEventListener('click', () => this.handleSend());
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });

        // Sync with backend on start
        await store.sync();

        // Load initial state
        const activeId = store.getActiveId();
        if (activeId) {
            await this.switchChat(activeId);
        } else if (store.chats.length > 0) {
            await this.switchChat(store.chats[0].id);
        } else {
            this.sidebar.newChatBtn.click();
        }
    }

    async switchChat(id) {
        if (!id) {
            this.layout.renderMessages([]);
            return;
        }

        // Close sidebar on mobile after selecting chat
        document.body.classList.remove('sidebar-open');

        store.setActiveId(id);
        let chat = store.get(id);

        // Load history if needed
        if (chat && (!chat.messages || chat.messages.length === 0)) {
            this.layout.setThinking(true);
            const history = await store.getHistory(id);
            if (chat) chat.messages = history;
            this.layout.setThinking(false);
        }

        this.layout.renderMessages(chat ? chat.messages : []);
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
            const cleanTitle = text.trim().split(/\s+/).slice(0, 6).join(' ');
            chat.title = cleanTitle + (text.split(/\s+/).length > 6 ? '...' : '');
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
                throw new Error(errText || `System Error ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedResponse = "";
            let partialData = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = (partialData + chunk).split('\n\n');
                partialData = lines.pop(); // last element might be incomplete

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6).trim();
                        if (!dataStr) continue;

                        try {
                            const data = JSON.parse(dataStr);

                            if (data.metadata) {
                                // Sync metadata
                                if (data.metadata.title && chat.title === 'New Strategy') {
                                    chat.title = data.metadata.title;
                                    this.sidebar.render();
                                }
                                if (data.metadata.conversationId) {
                                    store.setActiveId(data.metadata.conversationId);
                                }
                            }

                            if (data.delta) {
                                accumulatedResponse += data.delta;
                                assistantMessage = accumulatedResponse; // for safety

                                // Update UI immediately
                                if (typeof marked !== 'undefined') {
                                    currentMessageBox.innerHTML = marked.parse(accumulatedResponse);
                                    currentMessageBox.querySelectorAll('pre code').forEach((block) => {
                                        if (typeof hljs !== 'undefined') hljs.highlightElement(block);
                                    });
                                } else {
                                    currentMessageBox.textContent = accumulatedResponse;
                                }
                                this.layout.scrollToBottom(true); // true = sticky scroll
                            }

                            if (data.error) {
                                throw new Error(data.error);
                            }

                            if (data.done) {
                                // Stream finished
                            }
                        } catch (e) {
                            // JSON might be partial or malformed if chunked mid-line
                            if (e instanceof SyntaxError) continue;
                            throw e;
                        }
                    }
                }
            }

            // Save to history after full stream
            chat.messages.push({ role: 'assistant', content: accumulatedResponse });

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
            currentMessageRow.classList.remove('typing');
            store.save(); // Persist history
        }
    }

}


// Spark the platform
document.addEventListener('DOMContentLoaded', () => {
    window.MIND71 = new Mind71Platform();
});
