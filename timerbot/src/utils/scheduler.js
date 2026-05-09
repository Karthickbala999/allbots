'use strict';

const cron = require('node-cron');
const moment = require('moment-timezone');
const { ChannelType } = require('discord.js');
const {
  getAllActiveTimers,
  markStartFired,
  markEndFired,
  insertLog,
  getConfig,
  resetDailyTimer,
} = require('../database/db');
const { lockVoiceChannel, unlockVoiceChannel } = require('../utils/permissions');
const { vcOpenedEmbed, vcClosedEmbed } = require('../utils/embeds');
const logger = require('../utils/logger');

let client; // Discord.js Client reference

/**
 * Set the Discord client reference so the scheduler can access guilds/channels.
 * @param {import('discord.js').Client} discordClient
 */
function setClient(discordClient) {
  client = discordClient;
}

/**
 * Process a single timer:
 * - If current time >= start_time and start not fired → unlock VC, send open embed
 * - If current time >= end_time   and end   not fired → lock  VC, send close embed
 */
async function processTimer(timer) {
  const now   = moment().tz(timer.timezone);
  const today = now.format('YYYY-MM-DD');

  // ── Daily timer: roll over to today if it's a new day ───────────────────
  if (timer.is_daily) {
    if (timer.date < today) {
      // New day — reset fired flags and update date to today
      resetDailyTimer(timer.id, today);
      timer.date        = today;
      timer.start_fired = 0;
      timer.end_fired   = 0;
    }
    // If the end has already fired today, skip until tomorrow
    if (timer.end_fired) return;
  } else {
    // One-time timer: skip if it's not today or already fully done
    if (timer.date > today) return;
    if (timer.date < today && timer.end_fired) return;
  }

  const startMoment = moment.tz(`${timer.date} ${timer.start_time}`, 'YYYY-MM-DD HH:mm', timer.timezone);
  const endMoment   = moment.tz(`${timer.date} ${timer.end_time}`,   'YYYY-MM-DD HH:mm', timer.timezone);

  const guild = client.guilds.cache.get(timer.guild_id);
  if (!guild) {
    logger.warn(`[SCHEDULER] Guild ${timer.guild_id} not found in cache — skipping timer #${timer.id}`);
    return;
  }

  // Ensure channels are cached
  await guild.channels.fetch().catch(() => {});

  const vc = guild.channels.cache.get(timer.voice_channel_id);
  const tc = guild.channels.cache.get(timer.text_channel_id);

  // ── START: unlock ─────────────────────────────────────────────────────────
  if (!timer.start_fired && now.isSameOrAfter(startMoment)) {
    try {
      if (vc && vc.type === ChannelType.GuildVoice) {
        await unlockVoiceChannel(vc);
        logger.info(`[SCHEDULER] ⬆ Unlocked VC #${vc.name} for timer #${timer.id} (${timer.label})`);
      }

      if (tc && tc.isTextBased()) {
        const config = getConfig(timer.guild_id);
        const mentionRoleId = timer.mention_role_id || config?.mention_role_id || null;
        await tc.send({
          content: mentionRoleId ? `<@&${mentionRoleId}>` : null,
          embeds: [vcOpenedEmbed(timer, vc?.name)],
          allowedMentions: { roles: mentionRoleId ? [mentionRoleId] : [] },
        });
      }

      insertLog({
        guild_id: timer.guild_id,
        action: 'AUTO_UNLOCK',
        channel_id: timer.voice_channel_id,
        user_id: null,
        details: `Auto-unlocked for timer #${timer.id}: ${timer.label}`,
      });

      markStartFired(timer.id);

      // Post to log channel if configured
      const cfg = getConfig(timer.guild_id);
      if (cfg?.log_channel_id) {
        const logCh = guild.channels.cache.get(cfg.log_channel_id);
        await logCh?.send({ embeds: [vcOpenedEmbed(timer, vc?.name)] }).catch(() => {});
      }
    } catch (err) {
      logger.error(`[SCHEDULER] Failed to unlock VC for timer #${timer.id}:`, err);
    }
  }

  // ── END: lock ─────────────────────────────────────────────────────────────
  if (!timer.end_fired && timer.start_fired && now.isSameOrAfter(endMoment)) {
    try {
      if (vc && vc.type === ChannelType.GuildVoice) {
        await lockVoiceChannel(vc);
        logger.info(`[SCHEDULER] ⬇ Locked VC #${vc.name} for timer #${timer.id} (${timer.label})`);
      }

      if (tc && tc.isTextBased()) {
        const config = getConfig(timer.guild_id);
        const mentionRoleId = timer.mention_role_id || config?.mention_role_id || null;
        await tc.send({
          content: mentionRoleId ? `<@&${mentionRoleId}>` : null,
          embeds: [vcClosedEmbed(timer, vc?.name)],
          allowedMentions: { roles: mentionRoleId ? [mentionRoleId] : [] },
        });
      }

      insertLog({
        guild_id: timer.guild_id,
        action: 'AUTO_LOCK',
        channel_id: timer.voice_channel_id,
        user_id: null,
        details: `Auto-locked for timer #${timer.id}: ${timer.label}`,
      });

      markEndFired(timer.id);

      const cfg = getConfig(timer.guild_id);
      if (cfg?.log_channel_id) {
        const logCh = guild.channels.cache.get(cfg.log_channel_id);
        await logCh?.send({ embeds: [vcClosedEmbed(timer, vc?.name)] }).catch(() => {});
      }
    } catch (err) {
      logger.error(`[SCHEDULER] Failed to lock VC for timer #${timer.id}:`, err);
    }
  }
}

/**
 * Run the scheduler tick: load all active timers and process each.
 */
async function tick() {
  const timers = getAllActiveTimers();
  if (timers.length === 0) return;

  logger.debug(`[SCHEDULER] Tick — checking ${timers.length} active timer(s)...`);

  await Promise.allSettled(timers.map(processTimer));
}

/**
 * Start the cron job — runs every minute at second :00.
 */
function startScheduler(discordClient) {
  setClient(discordClient);

  // Run immediately on start to catch any timers that fired while the bot was offline
  tick().catch((err) => logger.error('[SCHEDULER] Initial tick failed:', err));

  cron.schedule('* * * * *', async () => {
    await tick().catch((err) => logger.error('[SCHEDULER] Tick error:', err));
  });

  logger.info('[SCHEDULER] ✅ Timer scheduler started (checks every minute)');
}

module.exports = { startScheduler };
