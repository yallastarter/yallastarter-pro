/**
 * Mind71 AI - Conversation Storage Engine
 */

class ConversationStore {
    constructor() {
        this.STORAGE_KEY = 'mind71_v2_chats';
        this.ACTIVE_KEY = 'mind71_v2_active';
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

    create(title = 'New Strategy') {
        const newChat = {
            id: crypto.randomUUID(),
            title: title,
            messages: [],
            createdAt: new Date().toISOString(),
            lastUpdate: new Date().toISOString()
        };
        this.chats.unshift(newChat);
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
        }
    }

    delete(id) {
        this.chats = this.chats.filter(c => c.id !== id);
        this.save();
    }

    setActiveId(id) {
        localStorage.setItem(this.ACTIVE_KEY, id);
    }

    getActiveId() {
        return localStorage.getItem(this.ACTIVE_KEY);
    }
}

export default new ConversationStore();
