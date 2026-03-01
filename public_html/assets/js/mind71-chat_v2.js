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
            console.log("calling /api/mind71/chat");
            const response = await fetch('/api/mind71/chat', {
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

            const data = await response.json();
            if (!data.success) throw new Error(data.message || "Intelligence Failure");

            const reply = data.reply;

            // Sync metadata
            if (data.title && chat.title === 'New Strategy') {
                chat.title = data.title;
                this.sidebar.render();
            }
            if (data.conversationId) {
                store.setActiveId(data.conversationId);
            }

            // ANIMATE RESPONSE
            await this.animateText(reply, currentMessageBox, currentMessageRow);

            // Save to history
            chat.messages.push({ role: 'assistant', content: reply });

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

    /**
     * Simulated Typewriter Effect
     * Animates text in word chunks
     */
    async animateText(text, box, row) {
        const words = text.split(' ');
        let currentText = "";

        // Remove empty state from scroll if needed
        if (this.layout.elements.scroll.querySelector('h1')) {
            this.layout.elements.scroll.innerHTML = '';
        }

        row.classList.add('typing');

        for (let i = 0; i < words.length;) {
            if (!this.abortController || this.abortController.signal.aborted) break;

            // Chunks of 3-8 words, adaptive based on length
            const chunkSize = words.length > 100 ? 8 : 4;
            const chunk = words.slice(i, i + chunkSize).join(' ');
            currentText += (i === 0 ? "" : " ") + chunk;
            i += chunkSize;

            // Update UI
            if (typeof marked !== 'undefined') {
                box.innerHTML = marked.parse(currentText);
                box.querySelectorAll('pre code').forEach((block) => {
                    if (typeof hljs !== 'undefined') hljs.highlightElement(block);
                });
            } else {
                box.textContent = currentText;
            }

            this.layout.scrollToBottom();

            // 25-50ms tick
            await new Promise(resolve => setTimeout(resolve, 35));
        }

        row.classList.remove('typing');
    }
}


// Spark the platform
document.addEventListener('DOMContentLoaded', () => {
    window.MIND71 = new Mind71Platform();
});
