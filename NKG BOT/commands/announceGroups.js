const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const config = require('../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('announce-groups')
        .setDescription('📢 Send a message to specific or ALL group channels at once')
        .addStringOption(option => 
            option.setName('message')
                .setDescription('The text of your announcement')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('title')
                .setDescription('Optional: Title for the announcement box')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('color')
                .setDescription('Optional: Border color (e.g. Gold, Red, Blue, #FFFFFF)')
                .setRequired(false))
        .addIntegerOption(option => 
            option.setName('start')
                .setDescription('Starting group number (optional, e.g. 1)')
                .setRequired(false))
        .addIntegerOption(option => 
            option.setName('end')
                .setDescription('Ending group number (optional, e.g. 94)')
                .setRequired(false))
        .addChannelOption(option => 
            option.setName('category')
                .setDescription('Optional: Only send to channels inside this category')
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName('attachment')
                .setDescription('Optional image or file to attach')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const messageText = interaction.options.getString('message');
        const embedTitle = interaction.options.getString('title');
        const embedColor = interaction.options.getString('color');
        const startGroup = interaction.options.getInteger('start');
        const endGroup = interaction.options.getInteger('end');
        const attachment = interaction.options.getAttachment('attachment');
        const category = interaction.options.getChannel('category');

        // Validation for start and end
        if ((startGroup && !endGroup) || (!startGroup && endGroup)) {
            return interaction.reply({ content: '❌ You must provide both a Start and an End group, or leave both empty for all.', flags: [MessageFlags.Ephemeral] });
        }
        if (startGroup && endGroup && startGroup > endGroup) {
            return interaction.reply({ content: '❌ Start group cannot be greater than end group.', flags: [MessageFlags.Ephemeral] });
        }

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        // Prepare the Embed
        const embed = new EmbedBuilder()
            .setDescription(messageText.replace(/\\n/g, '\n')) // Support manual newlines if they type \n
            .setColor(embedColor || config.colors.primary)
            .setFooter({ text: config.branding.footer });

        if (embedTitle) {
            embed.setTitle(embedTitle);
        }

        if (attachment) {
            embed.setImage(attachment.url);
        }

        try {
            await interaction.guild.channels.fetch();
            
            // Find and filter text channels
            const groupChannels = interaction.guild.channels.cache.filter(c => {
                if (!c.isTextBased()) return false;

                // If category is provided, only include channels inside it
                if (category && c.parentId !== category.id) return false;

                // If NO category is provided, we only look for channels starting with "group-" (Round 1 style)
                if (!category && !c.name.toLowerCase().includes('group')) return false;
                
                // If the user specified a range, extract the number from the name and check it
                if (startGroup && endGroup) {
                    const match = c.name.match(/(\d+)/); // Extracts the first number it finds
                    if (match) {
                        const num = parseInt(match[1]);
                        if (num >= startGroup && num <= endGroup) return true;
                    }
                    return false;
                }
                return true;
            });

            if (groupChannels.size === 0) {
                return interaction.editReply('❌ No matching group channels found.');
            }

            await interaction.editReply(`🚀 **Announcement starting...** Sending to ${groupChannels.size} channels.`);

            const messageIds = {};
            let successCount = 0;
            let failCount = 0;

            for (const [id, channel] of groupChannels) {
                try {
                    const sent = await channel.send({ 
                        content: '@everyone', 
                        embeds: [embed] 
                    });
                    
                    messageIds[channel.id] = sent.id;
                    successCount++;
                } catch (err) {
                    logger.error(`[ANNOUNCE] Failed to send to ${channel.name}: ${err.message}`);
                    failCount++;
                }

                // Small delay to prevent Discord rate limits
                await new Promise(resolve => setTimeout(resolve, 800));
            }

            // Save the batch so it can be edited or deleted later
            const dataPath = path.join(__dirname, '../data/lastAnnouncements.json');
            fs.writeFileSync(dataPath, JSON.stringify(messageIds, null, 2));

            await interaction.editReply(`✅ **Broadcast Complete!**\nSent to ${successCount} groups.\n${failCount > 0 ? `⚠️ Failed on ${failCount} channels.` : ''}`);

        } catch (error) {
            logger.error(`[ANNOUNCE] Failed: ${error.message}`);
            await interaction.editReply('❌ An error occurred while sending announcements.');
        }
    }
};
