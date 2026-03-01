/**
 * Mind71 AI - Conversation Storage Engine
 */

class ConversationStore {
    constructor() {
        this.STORAGE_KEY = 'mind71_v2_chats'; // List of metadata {id, title, lastUpdate}
        this.ACTIVE_KEY = 'mind71_conversationId';
        this.chats = this.load();
    }

    load() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || [];
        } catch (e) {
            console.error('Failed to load chats:', e);
            return [];
        }
    }

    save() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.chats));
    }

    // Sync threads for logged in users
    async sync() {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch('/api/mind71/conversations', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                // Merge/Override with backend data
                this.chats = data.conversations.map(c => ({
                    id: c.conversationId,
                    title: c.title,
                    lastUpdate: c.lastActivity,
                    messages: [] // Messages loaded on demand
                }));
                this.save();
            }
        } catch (err) {
            console.error('Sync failed:', err);
        }
    }

    async getHistory(id) {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
            const res = await fetch(`/api/mind71/conversation/${id}`, { headers });
            const data = await res.json();
            if (data.success) {
                return data.messages;
            }
        } catch (err) {
            console.error('Failed to fetch history:', err);
        }
        return [];
    }

    create() {
        const newId = crypto.randomUUID();
        const newChat = {
            id: newId,
            title: 'New Strategy',
            messages: [],
            lastUpdate: new Date().toISOString()
        };
        this.chats.unshift(newChat);
        this.setActiveId(newId);
        this.save();
        return newChat;
    }

    get(id) {
        return this.chats.find(c => c.id === id);
    }

    update(id, updates) {
        const index = this.chats.findIndex(c => c.id === id);
        if (index !== -1) {
            this.chats[index] = { ...this.chats[index], ...updates, lastUpdate: new Date().toISOString() };
            this.save();
        } else {
            // New thread from backend or unknown
            this.chats.unshift({ id, ...updates, lastUpdate: new Date().toISOString() });
            this.save();
        }
    }

    setActiveId(id) {
        localStorage.setItem(this.ACTIVE_KEY, id);
    }

    getActiveId() {
        return localStorage.getItem(this.ACTIVE_KEY);
    }
}

export default new ConversationStore();
