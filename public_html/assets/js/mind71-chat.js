/**
 * Mind71 Futuristic Chat Logic
 * Implements persistent history, streaming visuals, and UI management.
 */

class Mind71ChatSystem {
    constructor() {
        this.chats = JSON.parse(localStorage.getItem('mind71_chats') || '[]');
        this.activeChatId = localStorage.getItem('mind71_active_chat') || null;
        this.isTyping = false;

        this.elements = {
            sidebar: document.querySelector('.sidebar'),
            historyList: document.querySelector('.history-list'),
            messageContainer: document.querySelector('.messages-container'),
            textarea: document.querySelector('#chat-input'),
            sendBtn: document.querySelector('.btn-send'),
            thinkingIndicator: document.querySelector('.thinking-indicator'),
            newChatBtn: document.querySelector('.btn-new-chat')
        };

        this.init();
    }

    init() {
        // Event Listeners
        this.elements.newChatBtn.addEventListener('click', () => this.createNewChat());
        this.elements.textarea.addEventListener('input', () => this.autoResizeTextarea());
        this.elements.textarea.addEventListener('keydown', (e) => this.handleKeydown(e));
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());

        // Initial Load
        this.renderHistory();
        if (this.activeChatId) {
            this.loadChat(this.activeChatId);
        } else if (this.chats.length > 0) {
            this.loadChat(this.chats[0].id);
        } else {
            this.createNewChat();
        }
    }

    autoResizeTextarea() {
        this.elements.textarea.style.height = 'auto';
        this.elements.textarea.style.height = (this.elements.textarea.scrollHeight) + 'px';
    }

    handleKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
        }
    }

    createNewChat() {
        const newChat = {
            id: crypto.randomUUID(),
            title: 'New Analysis',
            messages: [],
            timestamp: new Date().toISOString()
        };

        this.chats.unshift(newChat);
        this.saveState();
        this.activeChatId = newChat.id;
        this.renderHistory();
        this.loadChat(newChat.id);
    }

    saveState() {
        localStorage.setItem('mind71_chats', JSON.stringify(this.chats));
        localStorage.setItem('mind71_active_chat', this.activeChatId);
    }

    renderHistory() {
        this.elements.historyList.innerHTML = '';
        this.chats.forEach(chat => {
            const item = document.createElement('div');
            item.className = `history-item ${chat.id === this.activeChatId ? 'active' : ''}`;
            item.onclick = () => this.loadChat(chat.id);

            item.innerHTML = `
                <div class="history-item-content">
                    <i class="fa-regular fa-message"></i>
                    <span class="history-item-title">${chat.title}</span>
                </div>
                <div class="history-actions">
                    <button class="action-btn" onclick="event.stopPropagation(); mind71.renameChat('${chat.id}')">
                        <i class="fa-regular fa-pen-to-square"></i>
                    </button>
                    <button class="action-btn delete" onclick="event.stopPropagation(); mind71.deleteChat('${chat.id}')">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            `;
            this.elements.historyList.appendChild(item);
        });
    }

    loadChat(id) {
        this.activeChatId = id;
        const chat = this.chats.find(c => c.id === id);
        if (!chat) return;

        this.saveState();
        this.renderHistory();

        // Clear and render messages
        this.elements.messageContainer.innerHTML = '';
        chat.messages.forEach(msg => {
            if (msg.role !== 'system') {
                this.addMessageUI(msg.content, msg.role);
            }
        });

        this.scrollToBottom();
    }

    addMessageUI(content, role) {
        const wrapper = document.createElement('div');
        wrapper.className = `message-wrapper ${role}`;

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        bubble.textContent = content; // Simple text for now, can add markdown parser later

        wrapper.appendChild(bubble);
        this.elements.messageContainer.appendChild(wrapper);
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.elements.messageContainer.scrollTop = this.elements.messageContainer.scrollHeight;
    }

    async sendMessage() {
        const text = this.elements.textarea.value.trim();
        if (!text || this.isTyping) return;

        const chatId = this.activeChatId;
        const chat = this.chats.find(c => c.id === chatId);
        if (!chat) return;

        // UI Update: User Message
        this.addMessageUI(text, 'user');
        chat.messages.push({ role: 'user', content: text });

        // Auto-title if it's the first message
        if (chat.title === 'New Analysis') {
            chat.title = text.substring(0, 30) + (text.length > 30 ? '...' : '');
            this.renderHistory();
        }

        this.elements.textarea.value = '';
        this.autoResizeTextarea();
        this.setTyping(true);

        try {
            const response = await fetch('/api/mind71/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    conversationId: chatId, // Note: Backend handles its own persistence but we sync ID
                    lang: document.documentElement.lang || 'en'
                })
            });

            const data = await response.json();

            if (data.success) {
                chat.messages.push({ role: 'assistant', content: data.reply });
                this.addMessageUI(data.reply, 'assistant');
            } else {
                this.addMessageUI(`Error: ${data.message}`, 'ai');
            }
        } catch (err) {
            console.error('Mind71 Sync Error:', err);
            this.addMessageUI("Communication failure. Please try again.", 'ai');
        } finally {
            this.setTyping(false);
            this.saveState();
        }
    }

    setTyping(status) {
        this.isTyping = status;
        this.elements.sendBtn.disabled = status;
        this.elements.thinkingIndicator.style.display = status ? 'flex' : 'none';
        if (status) this.scrollToBottom();
    }

    renameChat(id) {
        const chat = this.chats.find(c => c.id === id);
        if (!chat) return;
        const newTitle = prompt('Enter new title:', chat.title);
        if (newTitle) {
            chat.title = newTitle;
            this.renderHistory();
            this.saveState();
        }
    }

    deleteChat(id) {
        if (!confirm('Are you sure you want to delete this conversation?')) return;
        this.chats = this.chats.filter(c => c.id !== id);
        if (this.activeChatId === id) {
            this.activeChatId = this.chats.length > 0 ? this.chats[0].id : null;
        }
        this.saveState();
        this.renderHistory();
        if (this.activeChatId) this.loadChat(this.activeChatId);
        else this.createNewChat();
    }
}

// Global instance for inline button handlers
let mind71;
document.addEventListener('DOMContentLoaded', () => {
    mind71 = new Mind71ChatSystem();
});
