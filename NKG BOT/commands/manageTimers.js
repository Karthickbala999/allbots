const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder } = require('discord.js');
const timerManager = require('../utils/timerManager');
const config = require('../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('manage-timers')
        .setDescription('📋 View all active match-day timers, or delete one')
        .addStringOption(option => 
            option.setName('delete_id')
                .setDescription('Optional: The ID of the timer you want to delete')
                .setRequired(false)
                .setAutocomplete(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const timers = timerManager.getTimers().filter(t => t.guildId === interaction.guild.id);
        
        // Map timers to a readable format for the dropdown
        const choices = timers.map(t => {
            const preview = t.message.length > 30 ? t.message.substring(0, 30) + '...' : t.message;
            return {
                name: `Timer ${t.id} - "${preview}"`,
                value: t.id
            };
        });

        // Filter based on what user types
        const filtered = choices.filter(choice => choice.name.toLowerCase().includes(focusedValue.toLowerCase()));
        
        // Discord limits autocomplete to 25 choices
        await interaction.respond(filtered.slice(0, 25));
    },

    async execute(interaction) {
        const deleteId = interaction.options.getString('delete_id');
        
        // If the user provided an ID, delete it
        if (deleteId) {
            const success = timerManager.deleteTimer(deleteId);
            if (success) {
                return interaction.reply({ content: `✅ Successfully deleted timer **${deleteId}**.`, flags: [MessageFlags.Ephemeral] });
            } else {
                return interaction.reply({ content: `❌ Could not find a timer with ID **${deleteId}**.`, flags: [MessageFlags.Ephemeral] });
            }
        }

        // Otherwise, list all active timers
        const timers = timerManager.getTimers().filter(t => t.guildId === interaction.guild.id);
        
        if (timers.length === 0) {
            return interaction.reply({ content: '📭 There are no active timers scheduled for this server.', flags: [MessageFlags.Ephemeral] });
        }

        const embed = new EmbedBuilder()
            .setTitle('⏳ Active Match Timers')
            .setColor(config.colors.primary)
            .setDescription('To delete a timer, run `/manage-timers delete_id: <ID>`\n\n');

        let description = embed.data.description;
        timers.forEach((t, index) => {
            const unixTimestamp = Math.floor(t.triggerAt / 1000);
            const channel = `<#${t.channelId}>`;
            const messagePreview = t.message.length > 50 ? t.message.substring(0, 50) + '...' : t.message;
            
            description += `**${index + 1}. ID:** \`${t.id}\`\n`;
            description += `**Time:** <t:${unixTimestamp}:f> (<t:${unixTimestamp}:R>)\n`;
            description += `**Channel:** ${channel}\n`;
            description += `**Message:** "${messagePreview}"\n\n`;
        });

        embed.setDescription(description);

        await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    }
};
