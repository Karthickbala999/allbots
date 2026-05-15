const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('edit-announcement')
        .setDescription('✏️ Edit the last announcement you sent to the groups')
        .addStringOption(option => 
            option.setName('new_message')
                .setDescription('The new message to replace the old one')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const newMessage = interaction.options.getString('new_message');
        const dataPath = path.join(__dirname, '../data/lastAnnounceBatch.json');

        if (!fs.existsSync(dataPath)) {
            return interaction.reply({ content: '❌ No recorded announcement batch found to edit.', flags: [MessageFlags.Ephemeral] });
        }

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        try {
            const lastBatch = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            
            if (lastBatch.length === 0) {
                return interaction.editReply('❌ The last recorded announcement batch is empty.');
            }

            await interaction.editReply(`⏳ Editing ${lastBatch.length} announcement messages...`);

            let editedCount = 0;
            let failCount = 0;

            for (const item of lastBatch) {
                try {
                    const channel = await interaction.guild.channels.fetch(item.channelId);
                    if (channel) {
                        const message = await channel.messages.fetch(item.messageId);
                        if (message && message.editable) {
                            await message.edit({ content: newMessage });
                            editedCount++;
                        } else {
                            failCount++;
                        }
                    }
                } catch (err) {
                    failCount++;
                }
                
                // Small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 800));
            }

            await interaction.followUp({ 
                content: `✅ Done! Successfully edited ${editedCount} messages. ${failCount > 0 ? `Failed or missing: ${failCount}` : ''}`,
                flags: [MessageFlags.Ephemeral] 
            });

        } catch (error) {
            logger.error(`[EDIT ANNOUNCE] ${error.message}`);
            await interaction.editReply(`❌ An error occurred: ${error.message}`);
        }
    }
};
