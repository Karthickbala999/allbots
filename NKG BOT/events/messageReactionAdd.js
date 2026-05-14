const { Partials } = require('discord.js');
const rrManager = require('../utils/reactionRoleManager');
const logger = require('../utils/logger');

module.exports = {
    name: 'messageReactionAdd',
    async execute(reaction, user, client) {
        // Ignore bots
        if (user.bot) return;

        // If reaction is partial (old message), fetch it
        if (reaction.partial) {
            try { await reaction.fetch(); } catch { return; }
        }
        if (reaction.message.partial) {
            try { await reaction.message.fetch(); } catch { return; }
        }

        const messageId = reaction.message.id;
        const panel = rrManager.getForMessage(messageId);
        if (!panel) return; // Not a reaction role panel

        // Normalize emoji: custom = name:id, standard = the emoji char
        const emoji = reaction.emoji.id
            ? `${reaction.emoji.name}:${reaction.emoji.id}`
            : reaction.emoji.name;

        const roleId = panel[emoji];
        if (!roleId) return;

        try {
            const guild = reaction.message.guild;
            const member = await guild.members.fetch(user.id);
            await member.roles.add(roleId, 'Reaction Role assigned');
            logger.info(`[REACTION ROLE] +Role ${roleId} → ${user.tag}`);
        } catch (err) {
            logger.error(`[REACTION ROLE] Failed to add role: ${err.message}`);
        }
    }
};
