'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getTimerById, deleteTimer, getAllTimers } = require('../database/db');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { checkAdmin, replyError } = require('../utils/permissions');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deletetimer')
    .setDescription('🗑️  Delete a scheduled timer by its ID')
    .addIntegerOption((opt) =>
      opt.setName('timer_id')
        .setDescription('The Timer ID to delete (use /listtimers to find it)')
        .setRequired(true)
        .setMinValue(1)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const { ok, reason } = checkAdmin(interaction.member, interaction.guildId);
    if (!ok) return replyError(interaction, 'Permission Denied', reason);

    await interaction.deferReply({ ephemeral: true });

    const timerId = interaction.options.getInteger('timer_id');
    const timer   = getTimerById(timerId);

    if (!timer || timer.guild_id !== interaction.guildId || !timer.is_active) {
      return interaction.editReply({
        embeds: [errorEmbed('Timer Not Found', `No active timer with ID \`${timerId}\` was found in this server.`)],
      });
    }

    deleteTimer(timerId, interaction.guildId);

    logger.info(`[DELETE] Timer #${timerId} deleted by ${interaction.user.tag} in guild ${interaction.guildId}`);

    await interaction.editReply({
      embeds: [
        successEmbed(
          'Timer Deleted',
          [
            `> 🗑️  Timer **#${timerId}** has been removed.`,
            `> 📌  **Event:** ${timer.label}`,
            `> 🗓️  **Was scheduled for:** \`${timer.date}\` at \`${timer.start_time}\``,
          ].join('\n')
        ),
      ],
    });
  },
};
