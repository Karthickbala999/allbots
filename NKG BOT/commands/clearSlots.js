const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear-slots')
        .setDescription('🗑️ Delete the last batch of slot lists sent by the bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const dataPath = path.join(__dirname, '../data/lastBatch.json');

        if (!fs.existsSync(dataPath)) {
            return interaction.reply({ content: '❌ No recorded batch found to delete.', flags: [MessageFlags.Ephemeral] });
        }

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        try {
            const lastBatch = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            
            if (lastBatch.length === 0) {
                return interaction.editReply('❌ The last recorded batch is empty.');
            }

            await interaction.editReply(`⏳ Deleting ${lastBatch.length} messages...`);

            let deletedCount = 0;
            let failCount = 0;

            for (const item of lastBatch) {
                try {
                    const channel = await interaction.guild.channels.fetch(item.channelId);
                    if (channel) {
                        const message = await channel.messages.fetch(item.messageId);
                        if (message) {
                            await message.delete();
                            deletedCount++;
                        }
                    }
                } catch (err) {
                    // Message might already be deleted or channel inaccessible
                    failCount++;
                }
                
                // Small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            // Clear the file after deletion
            fs.writeFileSync(dataPath, JSON.stringify([], null, 2));

            await interaction.followUp({ 
                content: `✅ Done! Successfully deleted ${deletedCount} messages. ${failCount > 0 ? `Failed or already missing: ${failCount}` : ''}`,
                flags: [MessageFlags.Ephemeral] 
            });

        } catch (error) {
            logger.error(`[CLEAR SLOTS] ${error.message}`);
            await interaction.editReply(`❌ An error occurred while clearing slots: ${error.message}`);
        }
    }
};
