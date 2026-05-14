'use strict';

const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { insertTimer, getConfig, getAllTimers } = require('../database/db');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { checkAdmin, replyError } = require('../utils/permissions');
const {
  isValidTimezone,
  isValidTime,
  filterTimezones,
} = require('../utils/timezone');
const logger = require('../utils/logger');
const moment = require('moment-timezone');

require('dotenv').config();
const DEFAULT_TZ = process.env.DEFAULT_TIMEZONE || 'UTC';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('📅  Schedule a daily VC auto-open/close timer')
    .addStringOption((opt) =>
      opt.setName('label')
        .setDescription('Event name (e.g. "Tournament Session")')
        .setRequired(true)
        .setMaxLength(80)
    )
    .addStringOption((opt) =>
      opt.setName('start_time')
        .setDescription('VC opens at this time daily — 24h HH:MM (e.g. 14:30)')
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('end_time')
        .setDescription('VC closes at this time daily — 24h HH:MM (e.g. 16:00)')
        .setRequired(true)
    )
    .addChannelOption((opt) =>
      opt.setName('voice_channel')
        .setDescription('Voice channel to schedule (uses server default if omitted)')
        .addChannelTypes(ChannelType.GuildVoice)
        .setRequired(false)
    )
    .addChannelOption((opt) =>
      opt.setName('announcement_channel')
        .setDescription('Where to post open/close messages (uses server default if omitted)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName('timezone')
        .setDescription('Timezone (uses server default if omitted)')
        .setAutocomplete(true)
        .setRequired(false)
    )
    .addRoleOption((opt) =>
      opt.setName('mention_role')
        .setDescription('Role to @mention in announcements (uses server default if omitted)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    await interaction.respond(filterTimezones(focused));
  },

  async execute(interaction) {
    const { ok, reason } = checkAdmin(interaction.member, interaction.guildId);
    if (!ok) return replyError(interaction, 'Permission Denied', reason);

    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const label       = interaction.options.getString('label');
    const startTime   = interaction.options.getString('start_time');
    const endTime     = interaction.options.getString('end_time');
    const vcOpt       = interaction.options.getChannel('voice_channel');
    const tcOpt       = interaction.options.getChannel('announcement_channel');
    const tzOpt       = interaction.options.getString('timezone');
    const mentionRole = interaction.options.getRole('mention_role');

    // ── Resolve defaults from guild config ──────────────────────────────────
    const config = getConfig(interaction.guildId);

    const vcId         = vcOpt?.id ?? config?.voice_channel_id;
    const tcId         = tcOpt?.id ?? config?.text_channel_id;
    const tz           = tzOpt   ?? config?.timezone ?? DEFAULT_TZ;
    const mentionRoleId = mentionRole?.id ?? config?.mention_role_id ?? null;

    if (!vcId) {
      return interaction.editReply({
        embeds: [errorEmbed('No Voice Channel', 'Please provide a voice channel or run `/setupvc` first.')],
      });
    }
    if (!tcId) {
      return interaction.editReply({
        embeds: [errorEmbed('No Text Channel', 'Please provide an announcement channel or run `/setupvc` first.')],
      });
    }

    // ── Validation ──────────────────────────────────────────────────────────
    if (!isValidTime(startTime)) {
      return interaction.editReply({
        embeds: [errorEmbed('Invalid Start Time', `\`${startTime}\` is not valid. Use 24h \`HH:MM\` format (e.g. \`14:30\`).`)],
      });
    }
    if (!isValidTime(endTime)) {
      return interaction.editReply({
        embeds: [errorEmbed('Invalid End Time', `\`${endTime}\` is not valid. Use 24h \`HH:MM\` format (e.g. \`16:00\`).`)],
      });
    }
    if (!isValidTimezone(tz)) {
      return interaction.editReply({
        embeds: [errorEmbed('Invalid Timezone', `\`${tz}\` is not a valid timezone.`)],
      });
    }

    // Compare times as simple HH:MM strings — start must be < end
    if (startTime >= endTime) {
      return interaction.editReply({
        embeds: [errorEmbed('Time Conflict', 'Start time must be **before** end time.')],
      });
    }

    // ── Duplicate check — same VC + same start time = duplicate ────────────
    const existing = getAllTimers(interaction.guildId);
    const isDuplicate = existing.some(
      (t) => t.voice_channel_id === vcId && t.start_time === startTime && t.is_daily === 1
    );
    if (isDuplicate) {
      return interaction.editReply({
        embeds: [errorEmbed('Duplicate Schedule', 'A daily timer already exists for that channel at that start time.')],
      });
    }

    // ── Insert — use today's date as seed, mark is_daily = 1 ───────────────
    const today = moment().tz(tz).format('YYYY-MM-DD');

    try {
      const result = insertTimer({
        guild_id: interaction.guildId,
        voice_channel_id: vcId,
        text_channel_id: tcId,
        label,
        start_time: startTime,
        end_time: endTime,
        date: today,
        timezone: tz,
        is_daily: 1,
        mention_role_id: mentionRoleId,
        created_by: interaction.user.id,
      });

      logger.info(`[SCHEDULE] Daily timer #${result.lastInsertRowid} created by ${interaction.user.tag}`);

      const embed = successEmbed(
        'Daily Timer Scheduled! 🔁',
        [
          `> 📌  **Event:** ${label}`,
          `> 🔁  **Repeats:** Every day`,
          `> ⏰  **Opens at:** \`${startTime}\` (${tz})`,
          `> ⏰  **Closes at:** \`${endTime}\` (${tz})`,
          `> 🔊  **VC:** <#${vcId}>`,
          `> 📢  **Announce:** <#${tcId}>`,
          mentionRoleId ? `> 🔔  **Pings:** <@&${mentionRoleId}>` : '',
          `> 🆔  **Timer ID:** \`${result.lastInsertRowid}\``,
        ].filter(Boolean).join('\n')
      );

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      logger.error('[SCHEDULE] DB insert failed:', err);
      await interaction.editReply({
        embeds: [errorEmbed('Database Error', 'Failed to save the timer. Please try again.')],
      });
    }
  },
};
