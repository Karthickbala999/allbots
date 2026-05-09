'use strict';

require('dotenv').config();

const { REST, Routes } = require('discord.js');
const fs   = require('fs');
const path = require('path');

const TOKEN    = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID  = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error('❌  BOT_TOKEN and CLIENT_ID must be set in .env');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const cmd = require(path.join(commandsPath, file));
  if (cmd.data) {
    commands.push(cmd.data.toJSON());
    console.log(`  ✅  Queued: /${cmd.data.name}`);
  }
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log(`\n🔄  Registering ${commands.length} slash command(s)...`);

    if (GUILD_ID) {
      // Guild-scoped: instant update (for development)
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      console.log(`✅  Commands registered to guild ${GUILD_ID} (instant)`);
    } else {
      // Global: can take up to 1 hour to propagate
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log('✅  Commands registered globally (may take up to 1 hour)');
    }
  } catch (err) {
    console.error('❌  Failed to register commands:', err);
    process.exit(1);
  }
})();
