'use strict';

const { EmbedBuilder } = require('discord.js');

// ─── Brand Colors ────────────────────────────────────────────────────────────
const COLORS = {
  primary:  0x5865F2, // Discord Blurple
  success:  0x57F287, // Green
  danger:   0xED4245, // Red
  warning:  0xFEE75C, // Yellow
  info:     0x00B0F4, // Cyan
  locked:   0xFF4757, // Bright Red
  unlocked: 0x2ED573, // Bright Green
  neutral:  0x2F3136, // Dark
  purple:   0x9B59B6,
};

const DIVIDER = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

/**
 * Build the "VC Opened" embed.
 */
function vcOpenedEmbed(timer, channelName) {
  return new EmbedBuilder()
    .setColor(COLORS.unlocked)
    .setTitle('🟢  MATCH VC OPENED')
    .setDescription(
      [
        DIVIDER,
        '🎮  **The Voice Channel is now OPEN!**',
        `🔊  **Channel:** <#${timer.voice_channel_id}>`,
        `⏰  **Session:** \`${timer.start_time}\` → \`${timer.end_time}\``,
        `🗓️  **Date:** \`${timer.date}\``,
        `📌  **Event:** ${timer.label}`,
        '',
        '> Time to join the battle! Good luck, everyone. 🏆',
        DIVIDER,
      ].join('\n')
    )
    .setFooter({ text: '⚡ Timer Bot  •  Powered by Discord.js v14' })
    .setTimestamp();
}

/**
 * Build the "VC Closed" embed.
 */
function vcClosedEmbed(timer, channelName) {
  return new EmbedBuilder()
    .setColor(COLORS.locked)
    .setTitle('🔴  MATCH VC CLOSED')
    .setDescription(
      [
        DIVIDER,
        '🔒  **The Voice Channel has been LOCKED!**',
        `🔇  **Channel:** <#${timer.voice_channel_id}>`,
        `⏰  **Session ended at:** \`${timer.end_time}\``,
        `📌  **Event:** ${timer.label}`,
        '',
        '> Thanks for joining! See you in the next match. 👋',
        DIVIDER,
      ].join('\n')
    )
    .setFooter({ text: '⚡ Timer Bot  •  Powered by Discord.js v14' })
    .setTimestamp();
}

/**
 * Generic success embed.
 */
function successEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle(`✅  ${title}`)
    .setDescription(description)
    .setTimestamp();
}

/**
 * Generic error embed.
 */
function errorEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle(`❌  ${title}`)
    .setDescription(description)
    .setTimestamp();
}

/**
 * Generic info embed.
 */
function infoEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle(`ℹ️  ${title}`)
    .setDescription(description)
    .setTimestamp();
}

/**
 * Build the timer list embed.
 */
function timerListEmbed(timers, guildName) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle('⏱️  Active Tournament Timers')
    .setDescription(timers.length === 0 ? '> No active timers scheduled.' : DIVIDER)
    .setFooter({ text: `${guildName}  •  Timer Bot` })
    .setTimestamp();

  for (const t of timers) {
    const scheduleInfo = t.is_daily
      ? '> 🔁  **Repeats:** Every day'
      : `> 🗓️  **Date:** \`${t.date}\``;
    const status = t.start_fired ? (t.end_fired ? '🔴 Closed' : '🟢 Live') : '⏳ Pending';

    embed.addFields({
      name: `📌  ${t.label}  [ID: ${t.id}]`,
      value: [
        scheduleInfo,
        `> ⏰  **Time:** \`${t.start_time}\` → \`${t.end_time}\` (${t.timezone})`,
        `> 🔊  **VC:** <#${t.voice_channel_id}>`,
        `> 📢  **Announce:** <#${t.text_channel_id}>`,
        `> 🔵  **Status:** ${status}`,
      ].join('\n'),
      inline: false,
    });
  }

  return embed;
}

/**
 * Build the manual lock/unlock embed.
 */
function manualActionEmbed(action, channelId, userId) {
  const isLock = action === 'lock';
  return new EmbedBuilder()
    .setColor(isLock ? COLORS.locked : COLORS.unlocked)
    .setTitle(isLock ? '🔒  Voice Channel Locked' : '🔓  Voice Channel Unlocked')
    .setDescription(
      [
        `> **Channel:** <#${channelId}>`,
        `> **Action by:** <@${userId}>`,
        `> **Mode:** ${isLock ? 'Manual Lock 🔴' : 'Manual Unlock 🟢'}`,
      ].join('\n')
    )
    .setTimestamp();
}

/**
 * Build the setup confirmation embed.
 */
function setupEmbed(config) {
  return new EmbedBuilder()
    .setColor(COLORS.purple)
    .setTitle('⚙️  Server Setup Updated')
    .setDescription(
      [
        '> Your timer bot configuration has been saved.',
        '',
        `> 🔊  **Voice Channel:** <#${config.voice_channel_id}>`,
        `> 📢  **Announcement Channel:** <#${config.text_channel_id}>`,
        config.admin_role_id   ? `> 🛡️  **Admin Role:** <@&${config.admin_role_id}>` : '',
        config.mention_role_id ? `> 🔔  **Mention Role:** <@&${config.mention_role_id}> *(pinged on open/close)*` : '> 🔔  **Mention Role:** Not set',
        `> 🌍  **Timezone:** \`${config.timezone}\``,
      ].filter(Boolean).join('\n')
    )
    .setFooter({ text: 'Use /schedule to add your first timer!' })
    .setTimestamp();
}

module.exports = {
  COLORS,
  vcOpenedEmbed,
  vcClosedEmbed,
  successEmbed,
  errorEmbed,
  infoEmbed,
  timerListEmbed,
  manualActionEmbed,
  setupEmbed,
};
