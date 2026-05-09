'use strict';

const { ActivityType } = require('discord.js');
const { startScheduler } = require('../utils/scheduler');
const logger = require('../utils/logger');

module.exports = {
  name: 'ready',
  once: true,

  async execute(client) {
    logger.info(`[READY] ✅ Logged in as ${client.user.tag}`);
    logger.info(`[READY] Serving ${client.guilds.cache.size} guild(s) | ${client.users.cache.size} cached users`);

    // ── Set Bot Presence ──────────────────────────────────────────────────
    client.user.setPresence({
      activities: [
        {
          name: 'Managing Tournament Timers ⏰',
          type: ActivityType.Watching,
        },
      ],
      status: 'online',
    });

    // ── Start Timer Scheduler ─────────────────────────────────────────────
    startScheduler(client);
  },
};
