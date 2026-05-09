const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config/config');
const logger = require('./utils/logger');
require('colors');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
    ]
});

// Banner
console.log(`
███╗   ██╗██╗  ██╗ ██████╗     ██████╗  ██████╗ ████████╗
████╗  ██║██║ ██╔╝██╔════╝     ██╔══██╗██╔═══██╗╚══██╔══╝
██╔██╗ ██║█████╔╝ ██║  ███╗    ██████╔╝██║   ██║   ██║   
██║╚██╗██║██╔═██╗ ██║   ██║    ██╔══██╗██║   ██║   ██║   
██║ ╚████║██║  ██╗╚██████╔╝    ██████╔╝╚██████╔╝   ██║   
╚═╝  ╚═══╝╚═╝  ╚═╝ ╚═════╝     ╚═════╝  ╚═════╝    ╚═╝   
                ${'NKG BOT 24/7 ONLINE'.bold.cyan}
`.magenta);

// Load Handlers (Only Event & Anti-Crash)
['eventHandler', 'antiCrash'].forEach(handler => {
    require(`./handlers/${handler}`)(client);
});

// Login
client.login(config.token).catch(err => {
    logger.error(`[LOGIN ERROR] ${err.message}`);
});
