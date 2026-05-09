const { EmbedBuilder } = require('discord.js');
const leaveTimers = new Map();

module.exports = {
    name: 'voiceStateUpdate',
    execute(oldState, newState, client) {
        const guildId = oldState.guild.id;
        const player = client.manager.players.get(guildId);
        
        if (!player) return;

        // If the bot itself left the voice channel, clear any pending timers
        if (oldState.id === client.user.id && !newState.channelId) {
            if (leaveTimers.has(guildId)) {
                clearTimeout(leaveTimers.get(guildId));
                leaveTimers.delete(guildId);
            }
            return;
        }

        const botChannel = oldState.guild.members.me.voice.channel;
        if (!botChannel) return;

        // Count members in the bot's current channel, excluding bots
        const humansInVC = botChannel.members.filter(m => !m.user.bot).size;

        if (humansInVC === 0) {
            // If there's already a timer, don't start a new one
            if (leaveTimers.has(guildId)) return;

            // Start 3 minute timer (180000 milliseconds)
            const timeout = setTimeout(() => {
                const textChannel = client.channels.cache.get(player.textId);
                
                // Destroy player, which will trigger playerDestroy event globally
                const currentPlayer = client.manager.players.get(guildId);
                if (currentPlayer) {
                    currentPlayer.destroy();
                }
                
                leaveTimers.delete(guildId);
            }, 180000);

            leaveTimers.set(guildId, timeout);
        } else {
            // If humans are present, cancel any leave timer
            if (leaveTimers.has(guildId)) {
                clearTimeout(leaveTimers.get(guildId));
                leaveTimers.delete(guildId);
            }
        }
    }
};
