/**
 * Mind71 AI - Sidebar & History Manager
 */

import store from './conversationStore.js';

class SidebarManager {
    constructor(callbacks) {
        this.container = document.querySelector('.nav-history');
        this.newChatBtn = document.querySelector('.btn-premium');
        this.callbacks = callbacks;
        this.init();
    }

    init() {
        this.newChatBtn.addEventListener('click', () => {
            const newChat = store.create();
            this.render();
            this.callbacks.onChatSelect(newChat.id);
        });
        this.render();
    }

    render() {
        const activeId = store.getActiveId();
        this.container.innerHTML = '';

        store.chats.forEach(chat => {
            const item = document.createElement('div');
            item.className = `nav-item ${chat.id === activeId ? 'active' : ''}`;
            item.dataset.id = chat.id;

            item.innerHTML = `
                <i class="fa-regular fa-message"></i>
                <div class="nav-item-title">${chat.title}</div>
                <div class="nav-item-actions">
                    <button class="action-trigger rename" title="Rename"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="action-trigger delete" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            `;

            item.addEventListener('click', (e) => {
                if (e.target.closest('.action-trigger')) return;
                this.callbacks.onChatSelect(chat.id);
                this.render();
            });

            const renameBtn = item.querySelector('.rename');
            renameBtn.addEventListener('click', () => this.handleRename(chat.id));

            const deleteBtn = item.querySelector('.delete');
            deleteBtn.addEventListener('click', () => this.handleDelete(chat.id));

            this.container.appendChild(item);
        });
    }

    handleRename(id) {
        const chat = store.get(id);
        const newTitle = prompt('Rename Strategy:', chat.title);
        if (newTitle && newTitle.trim()) {
            store.update(id, { title: newTitle.trim() });
            this.render();
        }
    }

    handleDelete(id) {
        if (confirm('Permanently delete this intelligence session?')) {
            store.delete(id);
            if (store.getActiveId() === id) {
                const head = store.chats[0];
                if (head) this.callbacks.onChatSelect(head.id);
                else this.callbacks.onChatSelect(null);
            }
            this.render();
        }
    }
}

export default SidebarManager;
