const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const DATA_PATH = path.join(__dirname, '../data/timers.json');

// Ensure file exists
function loadTimers() {
    try {
        if (!fs.existsSync(DATA_PATH)) {
            fs.writeFileSync(DATA_PATH, JSON.stringify([]));
        }
        const data = fs.readFileSync(DATA_PATH, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        logger.error(`[TIMER_MGR] Failed to load timers: ${err.message}`);
        return [];
    }
}

function saveTimers(timers) {
    try {
        fs.writeFileSync(DATA_PATH, JSON.stringify(timers, null, 2));
    } catch (err) {
        logger.error(`[TIMER_MGR] Failed to save timers: ${err.message}`);
    }
}

module.exports = {
    getTimers() {
        return loadTimers();
    },

    deleteTimer(id) {
        const timers = loadTimers();
        const initialLength = timers.length;
        const newTimers = timers.filter(t => t.id !== id);
        
        if (newTimers.length !== initialLength) {
            saveTimers(newTimers);
            return true; // Successfully deleted
        }
        return false; // Not found
    },

    addTimer(triggerAt, channelId, message, mentionRoleId, guildId) {
        const timers = loadTimers();
        timers.push({
            id: Date.now().toString(),
            triggerAt,
            channelId,
            message,
            mentionRoleId,
            guildId
        });
        saveTimers(timers);
    },

    startTimerLoop(client) {
        // Check every minute
        setInterval(async () => {
            const timers = loadTimers();
            if (timers.length === 0) return;

            const now = Date.now();
            const pendingTimers = [];
            let modified = false;

            for (const t of timers) {
                if (now >= t.triggerAt) {
                    modified = true;
                    try {
                        const guild = client.guilds.cache.get(t.guildId);
                        if (!guild) continue;

                        const channel = guild.channels.cache.get(t.channelId);
                        if (!channel) continue;

                        let finalMessage = t.message;
                        if (t.mentionRoleId) {
                            if (t.mentionRoleId === guild.id) {
                                finalMessage = `@everyone ${finalMessage}`;
                            } else {
                                finalMessage = `<@&${t.mentionRoleId}> ${finalMessage}`;
                            }
                        }

                        await channel.send(finalMessage);
                        logger.info(`[TIMER_MGR] Executed saved timer for ${channel.name}`);
                    } catch (err) {
                        logger.error(`[TIMER_MGR] Execution error: ${err.message}`);
                    }
                } else {
                    pendingTimers.push(t);
                }
            }

            if (modified) {
                saveTimers(pendingTimers);
            }
        }, 60 * 1000);
    }
};
