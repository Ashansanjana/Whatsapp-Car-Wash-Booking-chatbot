/**
 * History Manager for WhatsApp Bot
 * Stores conversation history in memory
 */

class HistoryManager {
    constructor(limit = 10) {
        this.conversations = new Map();
        this.limit = limit;
    }

    /**
     * Add a message to the history
     * @param {string} chatId - The chat ID (phone number)
     * @param {Object} message - The message object { role: 'user'|'assistant'|'system', content: string }
     */
    addMessage(chatId, message) {
        if (!this.conversations.has(chatId)) {
            this.conversations.set(chatId, []);
        }

        const history = this.conversations.get(chatId);
        history.push(message);

        // Keep only the last 'limit' messages
        if (history.length > this.limit) {
            // We remove from the beginning, but we might want to keep system prompt if we stored it here.
            // However, system prompt is usually passed separately.
            this.conversations.set(chatId, history.slice(history.length - this.limit));
        }
    }

    /**
     * Get history for a chat
     * @param {string} chatId 
     * @returns {Array} List of messages
     */
    getMessages(chatId) {
        return this.conversations.get(chatId) || [];
    }

    /**
     * Clear history for a chat
     * @param {string} chatId 
     */
    clearHistory(chatId) {
        this.conversations.delete(chatId);
    }
}

module.exports = HistoryManager;
