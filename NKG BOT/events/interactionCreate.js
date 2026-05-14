const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const brManager = require('../utils/buttonRoleManager');
const logger = require('../utils/logger');
const config = require('../config/config');

// Helper: rebuild ActionRows from stored button data (max 5 rows × 5 buttons = 25)
function buildRows(buttons) {
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
        const chunk = buttons.slice(i, i + 5);
        const row = new ActionRowBuilder().addComponents(
            chunk.map(btn =>
                new ButtonBuilder()
                    .setCustomId(`buttonrole_${btn.roleId}`)
                    .setLabel(btn.label)
                    .setStyle(ButtonStyle[btn.style] ?? ButtonStyle.Secondary)
            )
        );
        rows.push(row);
    }
    return rows;
}

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // Only handle button clicks
        if (!interaction.isButton()) return;
        if (!interaction.customId.startsWith('buttonrole_')) return;

        const roleId = interaction.customId.replace('buttonrole_', '');
        const guild = interaction.guild;
        const member = interaction.member;

        try {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        } catch (err) {
            if (err.code === 10062) {
                return logger.warn(`[BUTTON ROLE] Interaction expired for ${member.user.tag} before it could be deferred.`);
            }
            logger.error(`[BUTTON ROLE] Interaction defer error: ${err.message}`);
            return;
        }

        try {
            const role = guild.roles.cache.get(roleId);
            if (!role) {
                return interaction.editReply({ content: '❌ Role not found. Contact an admin.' });
            }

            const hasRole = member.roles.cache.has(roleId);

            if (hasRole) {
                // Toggle OFF — remove the role
                await member.roles.remove(roleId, 'Button Role removed by user');
                logger.info(`[BUTTON ROLE] -Role "${role.name}" → ${member.user.tag}`);

                const removeEmbed = new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setDescription(`✅ Removed **${role.name}** from your roles.`);
                return interaction.editReply({ embeds: [removeEmbed] });

            } else {
                // SINGLE ROLE RULE: Remove any other G-roles first
                const otherGRoles = member.roles.cache.filter(r => 
                    r.name.startsWith('G-') && r.id !== roleId
                );

                if (otherGRoles.size > 0) {
                    await member.roles.remove(otherGRoles, 'Removing old group role (Single Role Rule)');
                    logger.info(`[BUTTON ROLE] Swapping roles for ${member.user.tag}: Removed ${otherGRoles.size} roles.`);
                }

                // Add the new role
                await member.roles.add(roleId, 'Button Role assigned by user');
                logger.info(`[BUTTON ROLE] +Role "${role.name}" → ${member.user.tag}`);

                const addEmbed = new EmbedBuilder()
                    .setColor(config.colors.success)
                    .setDescription(`✅ You've been given the **${role.name}** role!${otherGRoles.size > 0 ? '\n*(Your previous group role was removed)*' : ''}`);
                return interaction.editReply({ embeds: [addEmbed] });
            }

        } catch (err) {
            logger.error(`[BUTTON ROLE] Failed: ${err.message}`);
            return interaction.editReply({ content: '❌ Failed to update your roles. Make sure the bot has permission.' });
        }
    }
};
