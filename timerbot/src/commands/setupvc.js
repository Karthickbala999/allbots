'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const { upsertConfig, getConfig } = require('../database/db');
const { setupEmbed, errorEmbed } = require('../utils/embeds');
const { checkAdmin, replyError } = require('../utils/permissions');
const { isValidTimezone, filterTimezones } = require('../utils/timezone');
const logger = require('../utils/logger');

require('dotenv').config();
const DEFAULT_TZ = process.env.DEFAULT_TIMEZONE || 'UTC';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setupvc')
    .setDescription('⚙️  Configure the bot for this server (Admin only)')
    .addChannelOption((opt) =>
      opt.setName('voice_channel')
        .setDescription('Default voice channel to manage')
        .addChannelTypes(ChannelType.GuildVoice)
        .setRequired(true)
    )
    .addChannelOption((opt) =>
      opt.setName('announcement_channel')
        .setDescription('Channel where open/close announcements will be posted')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('timezone')
        .setDescription('Default timezone for this server (e.g. Asia/Kolkata)')
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addRoleOption((opt) =>
      opt.setName('admin_role')
        .setDescription('Role that can manage timers (besides Administrator)')
        .setRequired(false)
    )
    .addRoleOption((opt) =>
      opt.setName('mention_role')
        .setDescription('Role to @mention in VC open/close announcements')
        .setRequired(false)
    )
    .addChannelOption((opt) =>
      opt.setName('log_channel')
        .setDescription('Channel to post detailed lock/unlock logs')
        .addChannelTypes(ChannelType.GuildText)
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

    const vc          = interaction.options.getChannel('voice_channel');
    const tc          = interaction.options.getChannel('announcement_channel');
    const tz          = interaction.options.getString('timezone') || DEFAULT_TZ;
    const role        = interaction.options.getRole('admin_role');
    const mentionRole = interaction.options.getRole('mention_role');
    const logC        = interaction.options.getChannel('log_channel');

    if (!isValidTimezone(tz)) {
      return interaction.editReply({
        embeds: [errorEmbed('Invalid Timezone', `\`${tz}\` is not a valid timezone. Try something like \`Asia/Kolkata\` or \`America/New_York\`.`)],
      });
    }

    const config = upsertConfig(interaction.guildId, {
      voice_channel_id: vc.id,
      text_channel_id: tc.id,
      timezone: tz,
      admin_role_id: role?.id ?? null,
      mention_role_id: mentionRole?.id ?? null,
      log_channel_id: logC?.id ?? null,
    });

    logger.info(`[SETUP] Guild ${interaction.guildId} configured by ${interaction.user.tag}`);

    await interaction.editReply({ embeds: [setupEmbed(config)] });
  },
};
