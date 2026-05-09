const { Events } = require('discord.js');
const { joinVC } = require('../utils/voiceManager');
const config = require('../config/config');
const logger = require('../utils/logger');

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState, client) {
        // If the bot itself is moved or kicked
        if (newState.id === client.user.id) {
            // If the bot was disconnected or moved to a different channel
            if (!newState.channelId || newState.channelId !== config.voiceChannelId) {
                logger.warn(`[VOICE STATE] Bot was moved or disconnected from the target channel. Re-joining...`);
                
                // Small delay before re-joining to avoid rate limits
                setTimeout(async () => {
                    joinVC(client);
                }, 2000);
            }
        }
    },
};

