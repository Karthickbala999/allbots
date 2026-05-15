const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('group-chat')
        .setDescription('🔒 Lock or unlock the chat for the teams in all group channels')
        .addStringOption(option => 
            option.setName('action')
                .setDescription('Choose whether to lock or unlock the chat')
                .setRequired(true)
                .addChoices(
                    { name: '🔒 Lock (Disable Chat)', value: 'lock' },
                    { name: '🔓 Unlock (Enable Chat)', value: 'unlock' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const action = interaction.options.getString('action');
        const isLocking = action === 'lock';
        
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        try {
            await interaction.guild.channels.fetch();
            
            // Find all text channels starting with 'group-'
            const groupChannels = interaction.guild.channels.cache.filter(c => 
                c.isTextBased() && c.name.toLowerCase().startsWith('group-')
            );

            if (groupChannels.size === 0) {
                return interaction.editReply('❌ No group channels found.');
            }

            await interaction.editReply(`⏳ ${isLocking ? 'Locking' : 'Unlocking'} chat for ${groupChannels.size} groups... Please wait (takes about 1 minute).`);
            logger.info(`[GROUP CHAT] Starting ${action} on ${groupChannels.size} groups.`);

            let successCount = 0;
            let failCount = 0;

            for (const [id, channel] of groupChannels) {
                try {
                    // Iterate through all permission overwrites in the channel
                    for (const [overwriteId, overwrite] of channel.permissionOverwrites.cache) {
                        // type 0 is Role. We also skip the @everyone role (which has the same ID as the guild)
                        if (overwrite.type === 0 && overwriteId !== interaction.guild.id) {
                            const role = interaction.guild.roles.cache.get(overwriteId);
                            
                            // Target roles that start with "G" (e.g. G1, G-1, Group-1) and are not Admin roles
                            if (role && role.name.toLowerCase().startsWith('g') && !role.permissions.has(PermissionFlagsBits.Administrator)) {
                                await channel.permissionOverwrites.edit(overwriteId, {
                                    SendMessages: isLocking ? false : true
                                });
                            }
                        }
                    }
                    successCount++;
                } catch (err) {
                    logger.error(`[GROUP CHAT] Failed to modify ${channel.name}: ${err.message}`);
                    failCount++;
                }

                // Small delay to prevent Discord rate limits (Discord allows ~50 edits/sec, but we play it safe)
                await new Promise(resolve => setTimeout(resolve, 600));
            }

            await interaction.followUp({
                content: `✅ **Chat ${isLocking ? 'Locked' : 'Unlocked'}!**\nSuccessfully updated ${successCount} group channels.\n${failCount > 0 ? `⚠️ Failed on ${failCount} channels.` : ''}`,
                flags: [MessageFlags.Ephemeral]
            });

        } catch (error) {
            logger.error(`[GROUP CHAT] ${error.message}`);
            await interaction.editReply(`❌ Error: ${error.message}`);
        }
    }
};
