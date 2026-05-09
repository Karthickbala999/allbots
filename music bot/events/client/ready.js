const { ActivityType } = require('discord.js');

module.exports = {
    name: 'clientReady',
    once: true,
    execute(client) {
        client.logger.success(`Logged in as ${client.user.tag}`);
        
        client.user.setPresence({
            activities: [{ name: '/play | Music Bot', type: ActivityType.Listening }],
            status: 'online',
        });
    },
};
