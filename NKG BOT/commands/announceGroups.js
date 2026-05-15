const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('announce-groups')
        .setDescription('📢 Send a message to specific or ALL group channels at once')
        .addStringOption(option => 
            option.setName('message')
                .setDescription('The message to send to the groups')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('start')
                .setDescription('Starting group number (optional, e.g. 1)')
                .setRequired(false))
        .addIntegerOption(option => 
            option.setName('end')
                .setDescription('Ending group number (optional, e.g. 94)')
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName('attachment')
                .setDescription('Optional image or file to attach')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const messageText = interaction.options.getString('message');
        const startGroup = interaction.options.getInteger('start');
        const endGroup = interaction.options.getInteger('end');
        const attachment = interaction.options.getAttachment('attachment');

        // Validation for start and end
        if ((startGroup && !endGroup) || (!startGroup && endGroup)) {
            return interaction.reply({ content: '❌ You must provide both a Start and an End group, or leave both empty for all.', flags: [MessageFlags.Ephemeral] });
        }
        if (startGroup && endGroup && startGroup > endGroup) {
            return interaction.reply({ content: '❌ Start group cannot be greater than end group.', flags: [MessageFlags.Ephemeral] });
        }

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        try {
            await interaction.guild.channels.fetch();
            
            // Find and filter text channels starting with 'group-'
            const groupChannels = interaction.guild.channels.cache.filter(c => {
                if (!c.isTextBased() || !c.name.toLowerCase().startsWith('group-')) return false;
                
                // If the user specified a range, extract the number from the name and check if it's within range
                if (startGroup && endGroup) {
                    const match = c.name.match(/group-(\d+)/i);
                    if (match) {
                        const num = parseInt(match[1]);
                        if (num >= startGroup && num <= endGroup) return true;
                    }
                    return false;
                }
                
                return true;
            });

            if (groupChannels.size === 0) {
                return interaction.editReply('❌ No group channels found in that range.');
            }

            await interaction.editReply(`⏳ Broadcasting to ${groupChannels.size} groups... Please wait (this takes about 1 second per group).`);
            logger.info(`[ANNOUNCE] Starting broadcast to ${groupChannels.size} groups.`);

            let successCount = 0;
            let failCount = 0;

            const payload = { content: messageText };
            if (attachment) {
                payload.files = [attachment.url];
            }

            const fs = require('fs');
            const path = require('path');
            const sentMessages = [];
            
            for (const [id, channel] of groupChannels) {
                try {
                    const msg = await channel.send(payload);
                    sentMessages.push({ channelId: channel.id, messageId: msg.id });
                    successCount++;
                } catch (err) {
                    logger.error(`[ANNOUNCE] Failed to send to ${channel.name}: ${err.message}`);
                    failCount++;
                }

                // Small delay to prevent Discord rate limits
                await new Promise(resolve => setTimeout(resolve, 800));
            }

            // Save the batch so it can be edited or deleted later
            const dataPath = path.join(__dirname, '../data/lastAnnounceBatch.json');
            fs.writeFileSync(dataPath, JSON.stringify(sentMessages, null, 2));

            await interaction.followUp({
                content: `✅ **Broadcast Complete!**\nSuccessfully sent to ${successCount} groups.\n${failCount > 0 ? `⚠️ Failed to send to ${failCount} groups.` : ''}`,
                flags: [MessageFlags.Ephemeral]
            });

        } catch (error) {
            logger.error(`[ANNOUNCE] ${error.message}`);
            await interaction.editReply(`❌ Error: ${error.message}`);
        }
    }
};
