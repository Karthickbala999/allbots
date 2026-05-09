'use strict';

const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { insertLog, getConfig } = require('../database/db');
const { manualActionEmbed, errorEmbed } = require('../utils/embeds');
const { checkAdmin, lockVoiceChannel, replyError } = require('../utils/permissions');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockvc')
    .setDescription('🔒  Instantly lock a voice channel (deny Connect for everyone)')
    .addChannelOption((opt) =>
      opt.setName('voice_channel')
        .setDescription('Voice channel to lock (uses server default if omitted)')
        .addChannelTypes(ChannelType.GuildVoice)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const { ok, reason } = checkAdmin(interaction.member, interaction.guildId);
    if (!ok) return replyError(interaction, 'Permission Denied', reason);

    await interaction.deferReply({ ephemeral: false });

    const vcOpt  = interaction.options.getChannel('voice_channel');
    const config = getConfig(interaction.guildId);
    const vcId   = vcOpt?.id ?? config?.voice_channel_id;

    if (!vcId) {
      return interaction.editReply({
        embeds: [errorEmbed('No Channel', 'No voice channel specified and no default set. Run `/setupvc` first.')],
      });
    }

    const vc = interaction.guild.channels.cache.get(vcId);
    if (!vc || vc.type !== ChannelType.GuildVoice) {
      return interaction.editReply({
        embeds: [errorEmbed('Channel Not Found', `Could not find voice channel <#${vcId}>.`)],
      });
    }

    try {
      await lockVoiceChannel(vc);

      insertLog({
        guild_id: interaction.guildId,
        action: 'MANUAL_LOCK',
        channel_id: vcId,
        user_id: interaction.user.id,
        details: `Manual lock by ${interaction.user.tag}`,
      });

      logger.info(`[LOCKVC] <#${vcId}> locked manually by ${interaction.user.tag}`);

      await interaction.editReply({ embeds: [manualActionEmbed('lock', vcId, interaction.user.id)] });

      // Send to log channel if configured
      if (config?.log_channel_id) {
        const logChannel = interaction.guild.channels.cache.get(config.log_channel_id);
        await logChannel?.send({ embeds: [manualActionEmbed('lock', vcId, interaction.user.id)] });
      }
    } catch (err) {
      logger.error('[LOCKVC] Failed:', err);
      await interaction.editReply({
        embeds: [errorEmbed('Lock Failed', `Could not lock <#${vcId}>. Make sure I have **Manage Channels** permission.`)],
      });
    }
  },
};
