'use strict';

const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { insertLog, getConfig } = require('../database/db');
const { manualActionEmbed, errorEmbed } = require('../utils/embeds');
const { checkAdmin, unlockVoiceChannel, replyError } = require('../utils/permissions');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlockvc')
    .setDescription('🔓  Instantly unlock a voice channel (allow Connect for everyone)')
    .addChannelOption((opt) =>
      opt.setName('voice_channel')
        .setDescription('Voice channel to unlock (uses server default if omitted)')
        .addChannelTypes(ChannelType.GuildVoice)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const { ok, reason } = checkAdmin(interaction.member, interaction.guildId);
    if (!ok) return replyError(interaction, 'Permission Denied', reason);

    await interaction.deferReply();

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
      await unlockVoiceChannel(vc);

      insertLog({
        guild_id: interaction.guildId,
        action: 'MANUAL_UNLOCK',
        channel_id: vcId,
        user_id: interaction.user.id,
        details: `Manual unlock by ${interaction.user.tag}`,
      });

      logger.info(`[UNLOCKVC] <#${vcId}> unlocked manually by ${interaction.user.tag}`);

      await interaction.editReply({ embeds: [manualActionEmbed('unlock', vcId, interaction.user.id)] });

      if (config?.log_channel_id) {
        const logChannel = interaction.guild.channels.cache.get(config.log_channel_id);
        await logChannel?.send({ embeds: [manualActionEmbed('unlock', vcId, interaction.user.id)] });
      }
    } catch (err) {
      logger.error('[UNLOCKVC] Failed:', err);
      await interaction.editReply({
        embeds: [errorEmbed('Unlock Failed', `Could not unlock <#${vcId}>. Make sure I have **Manage Channels** permission.`)],
      });
    }
  },
};
