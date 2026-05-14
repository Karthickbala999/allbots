const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/buttonRoles.json');

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
    getAll() {
        return load();
    },

    getPanel(messageId) {
        const data = load();
        return data[messageId] || null;
    },

    // Create or overwrite a panel entry
    setPanel(messageId, channelId, buttons = []) {
        const data = load();
        data[messageId] = { channelId, buttons };
        save(data);
    },

    // Add a button to a panel
    addButton(messageId, channelId, roleId, label, style) {
        const data = load();
        if (!data[messageId]) {
            data[messageId] = { channelId, buttons: [] };
        }
        // Avoid duplicate role buttons
        data[messageId].buttons = data[messageId].buttons.filter(b => b.roleId !== roleId);
        data[messageId].buttons.push({ roleId, label, style });
        save(data);
    },

    // Remove a button by roleId
    removeButton(messageId, roleId) {
        const data = load();
        if (data[messageId]) {
            data[messageId].buttons = data[messageId].buttons.filter(b => b.roleId !== roleId);
            if (data[messageId].buttons.length === 0) delete data[messageId];
        }
        save(data);
    },

    // Remove entire panel
    removePanel(messageId) {
        const data = load();
        delete data[messageId];
        save(data);
    },

    isButtonPanel(messageId) {
        const data = load();
        return !!data[messageId];
    }
};
