const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/reactionRoles.json');

function load() {
    try {
        const raw = fs.readFileSync(DATA_PATH, 'utf8');
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

function save(data) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
    // Get all reaction role data
    getAll() {
        return load();
    },

    // Get mappings for a specific message
    getForMessage(messageId) {
        const data = load();
        return data[messageId] || null;
    },

    // Add emoji → role mapping to a message
    addMapping(messageId, emoji, roleId) {
        const data = load();
        if (!data[messageId]) data[messageId] = {};
        data[messageId][emoji] = roleId;
        save(data);
    },

    // Remove emoji mapping from a message
    removeMapping(messageId, emoji) {
        const data = load();
        if (data[messageId]) {
            delete data[messageId][emoji];
            if (Object.keys(data[messageId]).length === 0) delete data[messageId];
        }
        save(data);
    },

    // Remove entire message panel
    removePanel(messageId) {
        const data = load();
        delete data[messageId];
        save(data);
    },

    // Check if a message is a reaction role panel
    isPanel(messageId) {
        const data = load();
        return !!data[messageId];
    }
};
