const { Events } = require('discord.js');
const { joinVC, startWatchdog } = require('../utils/voiceManager');
const logger = require('../utils/logger');
const config = require('../config/config');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        logger.info(`[NKG BOT] Logged in as ${client.user.tag}`);
        
        // Initialize 24/7 Connection
        await joinVC(client);

        // Start Watchdog to check connection every 30s
        startWatchdog(client);
    },
};

