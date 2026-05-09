const { Client, GatewayIntentBits, Collection } = require('discord.js');
const mongoose = require('mongoose');
const config = require('./config/config');
const logger = require('./utils/logger');
const { loadEvents } = require('./handlers/eventHandler');
const { loadCommands } = require('./handlers/commandHandler');
const { AntiCrash } = require('./handlers/errorHandler');
const { initPlayer } = require('./player/kazagumo');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
});

client.commands = new Collection();
client.config = config;
client.logger = logger;

// Initialize anti-crash handler
AntiCrash(client);

// Connect to MongoDB
if (config.mongoUri) {
    mongoose.connect(config.mongoUri).then(() => {
        logger.success('Connected to MongoDB Database');
    }).catch((err) => {
        logger.error(`MongoDB connection error: ${err}`);
    });
} else {
    logger.warn('No MongoDB URI provided, some features like 24/7 or DJ roles might not work.');
}

// Initialize Lavalink/Kazagumo Player
initPlayer(client);

// Load Handlers
loadEvents(client);
loadCommands(client);

client.login(config.token).catch((err) => {
    logger.error(`Failed to login: ${err}`);
});
