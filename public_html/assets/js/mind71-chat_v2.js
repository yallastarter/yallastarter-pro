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
                const errData = await response.json().catch(() => ({}));
                const errMsg = errData.message || `System Error ${response.status}`;
                throw new Error(errMsg);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let assistantMessage = "";
            let messageBoxInitialised = false;
            let currentMessageRow = null;
            let currentMessageBox = null;

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
                                this.layout.addMessageToUI(`Intelligence Failure: ${parsed.error}`, 'ai');
                                break;
                            }

                            if (parsed.metadata) {
                                // Conversation ID sync if needed
                                continue;
                            }

                            if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
                                const content = parsed.choices[0].delta.content || "";
                                assistantMessage += content;

                                // Real-time UI update
                                if (!messageBoxInitialised && assistantMessage.length > 0) {
                                    // Remove empty state if present
                                    if (this.layout.elements.scroll.querySelector('h1')) {
                                        this.layout.elements.scroll.innerHTML = '';
                                    }

                                    currentMessageRow = document.createElement('div');
                                    currentMessageRow.className = 'message-row ai-msg';
                                    currentMessageRow.style.animation = 'fadeInSlide 0.4s ease-out';

                                    currentMessageBox = document.createElement('div');
                                    currentMessageBox.className = 'message-box markdown-content';

                                    currentMessageRow.appendChild(currentMessageBox);
                                    this.layout.elements.scroll.appendChild(currentMessageRow);

                                    messageBoxInitialised = true;
                                }

                                if (currentMessageBox) {
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
                            // Ignore parse errors for incomplete chunks
                        }
                    }
                }
            }

            // Save final message to history
            if (assistantMessage) {
                chat.messages.push({ role: 'assistant', content: assistantMessage });
            }

        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Generation stopped by user');
                // The partial message is already in the UI and state if we reached the stream reader
            } else {
                console.error('System Failure:', err);
                this.layout.addMessageToUI("Intelligence link severed. Check connection and retry.", 'ai');
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
