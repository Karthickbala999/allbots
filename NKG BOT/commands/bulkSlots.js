const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder } = require('discord.js');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bulk-slots')
        .setDescription('📤 Upload an Excel file to send slot lists to multiple channels')
        .addAttachmentOption(option => 
            option.setName('file')
                .setDescription('The Excel file (.xlsx or .csv)')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const attachment = interaction.options.getAttachment('file');
        
        if (!attachment.name.endsWith('.xlsx') && !attachment.name.endsWith('.xls') && !attachment.name.endsWith('.csv')) {
            return interaction.reply({ content: '❌ Please upload a valid Excel or CSV file.', flags: [MessageFlags.Ephemeral] });
        }

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        try {
            const response = await fetch(attachment.url);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const workbook = xlsx.read(buffer, { type: 'buffer' });
            
            // Assume the first sheet is the one we want
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            
            // Organized data by Group
            const groups = {};
            
            // Get the range of the sheet
            const range = xlsx.utils.decode_range(sheet['!ref']);

            // Scan every cell for "GROUP -" headers
            for (let r = range.s.r; r <= range.e.r; r++) {
                for (let c = range.s.c; c <= range.e.c; c++) {
                    const cell = sheet[xlsx.utils.encode_cell({ r, c })];
                    
                    if (cell && typeof cell.v === 'string' && cell.v.toUpperCase().includes('GROUP -')) {
                        // Extract the group number (e.g., from "GROUP - 56")
                        const groupMatch = cell.v.match(/GROUP\s*-\s*(\d+)/i);
                        if (groupMatch) {
                            const groupNum = groupMatch[1];
                            groups[groupNum] = [];
                            
                            // Collect the next 12 rows in the SAME column (Team Names)
                            for (let i = 1; i <= 12; i++) {
                                const teamCell = sheet[xlsx.utils.encode_cell({ r: r + i, c: c })];
                                if (teamCell && teamCell.v) {
                                    const teamName = teamCell.v.toString().trim();
                                    if (teamName && teamName !== '' && isNaN(teamName)) {
                                        groups[groupNum].push(teamName);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            const groupIds = Object.keys(groups);
            if (groupIds.length === 0) {
                return interaction.editReply('❌ Could not find "Group" or "Team" columns in your Excel sheet.');
            }

            await interaction.editReply(`⏳ Starting to send slot lists to ${groupIds.length} groups...`);

            let successCount = 0;
            let failCount = 0;

            const sentMessages = [];

            for (const groupNum of groupIds) {
                const teams = groups[groupNum];
                const channelName = `group-${groupNum}`;
                
                // Find channel by name
                const channel = interaction.guild.channels.cache.find(c => c.name.toLowerCase() === channelName.toLowerCase());
                
                if (channel) {
                    // Format the slot list
                    let description = '';
                    teams.forEach((team, index) => {
                        const slotNum = (index + 1).toString().padStart(2, '0');
                        description += `**Slot ${slotNum}**  ->  ${team}\n`;
                    });

                    const embed = new EmbedBuilder()
                        .setTitle(`TMR T3 3PM SLOTLIST - GROUP ${groupNum}`)
                        .setColor('#00ffcc')
                        .setDescription(description)
                        .setTimestamp();

                    try {
                        const msg = await channel.send({ embeds: [embed] });
                        sentMessages.push({ channelId: channel.id, messageId: msg.id });
                        successCount++;
                    } catch (err) {
                        logger.error(`[BULK SLOTS] Failed to send to ${channelName}: ${err.message}`);
                        failCount++;
                    }
                } else {
                    logger.warn(`[BULK SLOTS] Channel not found: ${channelName}`);
                    failCount++;
                }
                
                // Small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Save the batch info so we can delete it later
            try {
                const dataPath = path.join(__dirname, '../data/lastBatch.json');
                fs.writeFileSync(dataPath, JSON.stringify(sentMessages, null, 2));
            } catch (err) {
                logger.error(`[BULK SLOTS] Failed to save batch data: ${err.message}`);
            }

            await interaction.followUp({ 
                content: `✅ Done! Sent ${successCount} lists. ${failCount > 0 ? `Failed: ${failCount}` : ''}`,
                flags: [MessageFlags.Ephemeral] 
            });

        } catch (error) {
            logger.error(`[BULK SLOTS] ${error.message}`);
            await interaction.editReply(`❌ An error occurred while processing the file: ${error.message}`);
        }
    }
};
