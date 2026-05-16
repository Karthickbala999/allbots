const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bulk-roles')
        .setDescription('🛡️ Bulk-create a range of roles quickly')
        .addIntegerOption(option => 
            option.setName('start')
                .setDescription('Starting number')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('end')
                .setDescription('Ending number')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('prefix')
                .setDescription('Role prefix (e.g., "G-")')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const start = interaction.options.getInteger('start');
        const end = interaction.options.getInteger('end');
        const prefix = interaction.options.getString('prefix');

        if (start > end) {
            return interaction.reply({ content: '❌ Start must be smaller than End.', ephemeral: true });
        }

        const total = (end - start) + 1;
        if (total > 100) {
            return interaction.reply({ content: '❌ For safety, please only create up to 100 roles at once.', ephemeral: true });
        }

        await interaction.deferReply();
        await interaction.editReply(`⏳ **Creating ${total} roles (${prefix}${start} to ${prefix}${end})...**`);

        let count = 0;
        for (let i = start; i <= end; i++) {
            try {
                const name = `${prefix}${i}`;
                const exists = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === name.toLowerCase());
                
                if (!exists) {
                    await interaction.guild.roles.create({
                        name: name,
                        reason: 'Bulk Role Creation Command'
                    });
                    count++;
                }
                // Small delay to avoid Discord rate limits
                await new Promise(r => setTimeout(r, 500));
            } catch (err) {
                logger.error(`[ROLES] Failed on ${i}: ${err.message}`);
            }
        }

        await interaction.editReply(`✅ **Complete!** Created **${count}** new roles. (Skipped roles that already existed)`);
    }
};
