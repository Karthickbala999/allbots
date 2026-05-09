'use strict';

const { PermissionFlagsBits } = require('discord.js');
const { getConfig } = require('../database/db');
const { errorEmbed } = require('./embeds');

/**
 * Check if a guild member has admin permission.
 * Supports either Discord Administrator flag OR a configured admin role.
 *
 * @param {import('discord.js').GuildMember} member
 * @param {string} guildId
 * @returns {{ ok: boolean, reason?: string }}
 */
function checkAdmin(member, guildId) {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) {
    return { ok: true };
  }

  const config = getConfig(guildId);
  if (config?.admin_role_id && member.roles.cache.has(config.admin_role_id)) {
    return { ok: true };
  }

  return {
    ok: false,
    reason: '🚫  You need the **Administrator** permission or the configured admin role to use this command.',
  };
}

/**
 * Lock a voice channel (deny Connect permission for @everyone).
 * @param {import('discord.js').VoiceChannel} channel
 */
async function lockVoiceChannel(channel) {
  await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
    Connect: false,
    Speak: false,
  });
}

/**
 * Unlock a voice channel (allow Connect permission for @everyone).
 * @param {import('discord.js').VoiceChannel} channel
 */
async function unlockVoiceChannel(channel) {
  await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
    Connect: true,
    Speak: null, // reset to role default
  });
}

/**
 * Reply to an interaction with an ephemeral error embed.
 */
async function replyError(interaction, title, description) {
  const embed = errorEmbed(title, description);
  const payload = { embeds: [embed], ephemeral: true };
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp(payload);
  } else {
    await interaction.reply(payload);
  }
}

module.exports = { checkAdmin, lockVoiceChannel, unlockVoiceChannel, replyError };
