const rrManager = require('../utils/reactionRoleManager');
const logger = require('../utils/logger');

module.exports = {
    name: 'messageReactionRemove',
    async execute(reaction, user, client) {
        // Ignore bots
        if (user.bot) return;

        // If reaction is partial, fetch it
        if (reaction.partial) {
            try { await reaction.fetch(); } catch { return; }
        }
        if (reaction.message.partial) {
            try { await reaction.message.fetch(); } catch { return; }
        }

        const messageId = reaction.message.id;
        const panel = rrManager.getForMessage(messageId);
        if (!panel) return;

        // Normalize emoji
        const emoji = reaction.emoji.id
            ? `${reaction.emoji.name}:${reaction.emoji.id}`
            : reaction.emoji.name;

        const roleId = panel[emoji];
        if (!roleId) return;

        try {
            const guild = reaction.message.guild;
            const member = await guild.members.fetch(user.id);
            await member.roles.remove(roleId, 'Reaction Role removed');
            logger.info(`[REACTION ROLE] -Role ${roleId} → ${user.tag}`);
        } catch (err) {
            logger.error(`[REACTION ROLE] Failed to remove role: ${err.message}`);
        }
    }
};
