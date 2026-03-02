/**
 * Mind71 AI - Chat Layout & UI Engine
 */

import store from './conversationStore.js';

class ChatLayout {
    constructor() {
        this.elements = {
            scroll: document.querySelector('.chat-scroll'),
            input: document.querySelector('#main-input'),
            sendBtn: document.querySelector('.btn-send-glow'),
            thinking: document.querySelector('.thinking-feedback'),
            stopBtn: document.querySelector('#stop-generation'),
            modelBadge: document.querySelector('#model-badge')
        };
        this.isTyping = false;
    }

    renderMessages(messages) {
        this.elements.scroll.innerHTML = '';
        if (messages.length === 0) {
            this.renderEmptyState();
            return;
        }

        messages.forEach(msg => {
            this.addMessageToUI(msg.content, msg.role);
        });
        this.scrollToBottom();
    }

    renderEmptyState() {
        this.elements.scroll.innerHTML = `
            <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; max-width: 600px; margin: 100px auto; opacity: 0.8;">
                <div class="brand-orb" style="width: 60px; height: 60px; margin-bottom: 2rem;"></div>
                <h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 1rem; letter-spacing: -0.05em;">MIND71 Intelligence</h1>
                <p style="color: var(--text-secondary); line-height: 1.8; font-size: 1.1rem;">
                    Analyzing Saudi business ecosystems and Vision 2030 opportunities. 
                    How can I assist your innovation strategy today?
                </p>
            </div>
        `;
    }

    addMessageToUI(content, role) {
        // Remove empty state if present
        if (this.elements.scroll.querySelector('h1')) {
            this.elements.scroll.innerHTML = '';
        }

        const row = document.createElement('div');
        row.className = `message-row ${role === 'user' ? 'user-msg' : 'ai-msg'}`;
        if (role === 'ai') row.classList.add('typing');

        const box = document.createElement('div');
        box.className = 'message-box markdown-content';

        if (content) {
            // Parse markdown and sanitize/highlight
            if (typeof marked !== 'undefined') {
                box.innerHTML = marked.parse(content);
                box.querySelectorAll('pre code').forEach((block) => {
                    if (typeof hljs !== 'undefined') hljs.highlightElement(block);
                });
            } else {
                box.textContent = content;
            }
        }

        row.appendChild(box);
        this.elements.scroll.appendChild(row);
        this.scrollToBottom();

        return box;
    }

    setThinking(status) {
        this.isTyping = status;
        this.elements.sendBtn.disabled = status;
        this.elements.thinking.style.display = status ? 'flex' : 'none';
        if (this.elements.stopBtn) {
            this.elements.stopBtn.style.display = status ? 'flex' : 'none';
        }
        if (status) this.scrollToBottom();
    }

    scrollToBottom(force = false) {
        const { scroll } = this.elements;
        const threshold = 100; // px from bottom to be considered "at bottom"
        const isAtBottom = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < threshold;

        if (force || isAtBottom) {
            scroll.scrollTop = scroll.scrollHeight;
        }
    }

    resetInput() {
        this.elements.input.value = '';
        this.elements.input.style.height = 'auto';
    }
}

export default ChatLayout;
