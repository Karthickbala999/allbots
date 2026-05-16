const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const timerManager = require('../utils/timerManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timer')
        .setDescription('⏱️ Schedule a permanent reminder to be sent in the future')
        .addStringOption(option => 
            option.setName('message')
                .setDescription('The reminder text you want to send')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('days')
                .setDescription('Optional: How many days from now?')
                .setRequired(false))
        .addIntegerOption(option => 
            option.setName('hours')
                .setDescription('Optional: How many hours from now?')
                .setRequired(false))
        .addIntegerOption(option => 
            option.setName('minutes')
                .setDescription('Optional: How many minutes from now?')
                .setRequired(false))
        .addRoleOption(option => 
            option.setName('mention_role')
                .setDescription('Optional: Mention a specific role when the timer goes off')
                .setRequired(false))
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('Optional: Where to send it (defaults to the channel you type this in)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const messageText = interaction.options.getString('message');
        const days = interaction.options.getInteger('days') || 0;
        const hours = interaction.options.getInteger('hours') || 0;
        const minutes = interaction.options.getInteger('minutes') || 0;
        
        const mentionRole = interaction.options.getRole('mention_role');
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

        const totalMinutes = (days * 24 * 60) + (hours * 60) + minutes;

        if (totalMinutes < 1) {
            return interaction.reply({ content: '❌ You must set at least 1 minute into the future! Use the days, hours, or minutes boxes.', flags: [MessageFlags.Ephemeral] });
        }

        const msDelay = totalMinutes * 60 * 1000;
        const triggerAt = Date.now() + msDelay;
        const unixTimestamp = Math.floor(triggerAt / 1000);

        // Add to persistent storage
        timerManager.addTimer(triggerAt, targetChannel.id, messageText, mentionRole ? mentionRole.id : null, interaction.guild.id);

        await interaction.reply({ 
            content: `✅ **Permanent Timer Set!**\nYour message has been scheduled and safely saved to the database.\nIt will send exactly <t:${unixTimestamp}:R> in ${targetChannel}.`,
            flags: [MessageFlags.Ephemeral] 
        });
    }
};
