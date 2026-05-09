'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getAllTimers } = require('../database/db');
const { timerListEmbed, infoEmbed } = require('../utils/embeds');
const { checkAdmin, replyError } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('listtimers')
    .setDescription('📋  List all active scheduled timers for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const { ok, reason } = checkAdmin(interaction.member, interaction.guildId);
    if (!ok) return replyError(interaction, 'Permission Denied', reason);

    await interaction.deferReply({ ephemeral: true });

    const timers = getAllTimers(interaction.guildId);
    const embed  = timerListEmbed(timers, interaction.guild.name);

    await interaction.editReply({ embeds: [embed] });
  },
};
