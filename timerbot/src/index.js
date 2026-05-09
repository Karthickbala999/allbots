'use strict';

require('dotenv').config();

const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs   = require('fs');
const path = require('path');
const logger = require('./utils/logger');
const { initDb } = require('./database/db');

// ─── Validate Environment ─────────────────────────────────────────────────────
if (!process.env.BOT_TOKEN) {
  logger.error('BOT_TOKEN is not set in .env — cannot start.');
  process.exit(1);
}
if (!process.env.CLIENT_ID) {
  logger.error('CLIENT_ID is not set in .env — cannot start.');
  process.exit(1);
}

// ─── Create Client ────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel],
});

// ─── Command Collection ───────────────────────────────────────────────────────
client.commands = new Collection();

function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (!command.data || !command.execute) {
      logger.warn(`[LOADER] Skipping ${file} — missing data or execute export.`);
      continue;
    }
    client.commands.set(command.data.name, command);
    logger.debug(`[LOADER] Loaded command: /${command.data.name}`);
  }
  logger.info(`[LOADER] ✅ Loaded ${client.commands.size} command(s)`);
}

function loadEvents() {
  const eventsPath = path.join(__dirname, 'events');
  const eventFiles = fs.readdirSync(eventsPath).filter((f) => f.endsWith('.js'));

  for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    if (!event.name || !event.execute) {
      logger.warn(`[LOADER] Skipping event ${file} — missing name or execute export.`);
      continue;
    }
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
    logger.debug(`[LOADER] Registered event: ${event.name} (once=${!!event.once})`);
  }
  logger.info(`[LOADER] ✅ Registered ${eventFiles.length} event(s)`);
}

// ─── Anti-Crash ───────────────────────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  logger.error('[PROCESS] Unhandled Promise Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  logger.error('[PROCESS] Uncaught Exception:', err);
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────
(async () => {
  try {
    logger.info('[BOOT] Initializing database...');
    await initDb();
    logger.info('[BOOT] ✅ Database ready');

    loadCommands();
    loadEvents();

    logger.info('[BOOT] Starting Discord Timer Bot...');
    await client.login(process.env.BOT_TOKEN);
  } catch (err) {
    logger.error('[BOOT] Startup failed:', err);
    process.exit(1);
  }
})();
