const { Client, GatewayIntentBits, Collection } = require('discord.js');
const config = require('./config/config');
const logger = require('./utils/logger');
require('colors');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers,
    ],
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'] // Required for reaction events on old messages
});

client.commands = new Collection();

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

// Load Handlers
['eventHandler', 'antiCrash', 'commandHandler'].forEach(handler => {
    require(`./handlers/${handler}`)(client);
});

// Login
client.login(config.token).catch(err => {
    logger.error(`[LOGIN ERROR] ${err.message}`);
});
