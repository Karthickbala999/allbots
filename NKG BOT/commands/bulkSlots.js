const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder } = require('discord.js');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bulk-slots')
        .setDescription('📤 Professional Tournament Slot Dispatcher')
        .addStringOption(option => 
            option.setName('title')
                .setDescription('The title for the tournament (e.g., ROUND1-ID-PASS)')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('start')
                .setDescription('Starting group number (e.g., 1)')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('end')
                .setDescription('Ending group number (e.g., 94)')
                .setRequired(true))
        .addAttachmentOption(option => 
            option.setName('file')
                .setDescription('The Excel file containing team data')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const title = interaction.options.getString('title');
        const startGroup = interaction.options.getInteger('start');
        const endGroup = interaction.options.getInteger('end');
        const attachment = interaction.options.getAttachment('file');

        // 1. Validation
        if (startGroup < 1) {
            return interaction.reply({ content: '❌ Starting group must be 1 or higher.', flags: [MessageFlags.Ephemeral] });
        }
        if (startGroup > endGroup) {
            return interaction.reply({ content: '❌ Start group cannot be greater than end group.', flags: [MessageFlags.Ephemeral] });
        }
        if (endGroup - startGroup > 100) {
            return interaction.reply({ content: '❌ Maximum range is 100 groups per command to avoid rate limits.', flags: [MessageFlags.Ephemeral] });
        }
        if (!attachment.name.endsWith('.xlsx') && !attachment.name.endsWith('.xls') && !attachment.name.endsWith('.csv')) {
            return interaction.reply({ content: '❌ Please upload a valid Excel or CSV file.', flags: [MessageFlags.Ephemeral] });
        }

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        try {
            // 2. Parse Excel File
            const response = await fetch(attachment.url);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const workbook = xlsx.read(buffer, { type: 'buffer' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const range = xlsx.utils.decode_range(sheet['!ref']);

            const groupsData = {};

            // Scan for "GROUP - X" headers
            for (let r = range.s.r; r <= range.e.r; r++) {
                for (let c = range.s.c; c <= range.e.c; c++) {
                    const cell = sheet[xlsx.utils.encode_cell({ r, c })];
                    if (cell && typeof cell.v === 'string' && cell.v.toUpperCase().includes('GROUP -')) {
                        const groupMatch = cell.v.match(/GROUP\s*-\s*(\d+)/i);
                        if (groupMatch) {
                            const groupNum = parseInt(groupMatch[1]);
                            // Only collect data if it's within our requested range
                            if (groupNum >= startGroup && groupNum <= endGroup) {
                                groupsData[groupNum] = [];
                                for (let i = 1; i <= 12; i++) {
                                    const teamCell = sheet[xlsx.utils.encode_cell({ r: r + i, c: c })];
                                    if (teamCell && teamCell.v) {
                                        const teamName = teamCell.v.toString().trim();
                                        if (teamName && isNaN(teamName)) groupsData[groupNum].push(teamName);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            const foundGroupIds = Object.keys(groupsData).sort((a, b) => a - b);
            if (foundGroupIds.length === 0) {
                return interaction.editReply(`❌ No team data found for groups ${startGroup} to ${endGroup} in the Excel file.`);
            }

            await interaction.editReply(`⏳ Starting ordered dispatch for ${foundGroupIds.length} groups...`);

            let successCount = 0;
            const sentMessages = [];

            // 3. Sequential Ordered Sending
            for (let i = startGroup; i <= endGroup; i++) {
                const teams = groupsData[i];
                if (!teams) continue;

                const channelName = `group-${i}`;
                const channel = interaction.guild.channels.cache.find(c => c.name.toLowerCase() === channelName.toLowerCase());

                if (channel) {
                    // Calculate Section (e.g., 1-10, 11-20)
                    const sectionStart = Math.floor((i - 1) / 10) * 10 + 1;
                    const sectionEnd = sectionStart + 9;
                    const sectionLabel = `${title} (${sectionStart}–${sectionEnd})`;

                    // Format Description
                    let description = '';
                    for (let s = 1; s <= 12; s++) {
                        const team = teams[s - 1] || '---';
                        description += `**Slot ${s.toString().padStart(2, '0')}**  ->  ${team}\n`;
                    }

                    const embed = new EmbedBuilder()
                        .setTitle(sectionLabel)
                        .setDescription(`### GROUP ${i} SLOTLIST\n${description}`)
                        .setColor('#00ffcc')
                        .setFooter({ text: `NKG ESPORTS | Group ${i} of ${endGroup}` })
                        .setTimestamp();

                    try {
                        const msg = await channel.send({ embeds: [embed] });
                        sentMessages.push({ channelId: channel.id, messageId: msg.id });
                        successCount++;
                    } catch (err) {
                        logger.error(`[BULK SLOTS] Failed to send to ${channelName}: ${err.message}`);
                    }
                }

                // Strictly ordered delay to prevent rate limits and ensure sequence
                await new Promise(resolve => setTimeout(resolve, 800));
            }

            // 4. Save for Undo
            const dataPath = path.join(__dirname, '../data/lastBatch.json');
            fs.writeFileSync(dataPath, JSON.stringify(sentMessages, null, 2));

            await interaction.followUp({ 
                content: `✅ **Successfully Dispatched!**\nSent ${successCount} lists to channels group-${startGroup} through group-${endGroup}.`,
                flags: [MessageFlags.Ephemeral] 
            });

        } catch (error) {
            logger.error(`[BULK SLOTS] ${error.message}`);
            await interaction.editReply(`❌ Error: ${error.message}`);
        }
    }
};
