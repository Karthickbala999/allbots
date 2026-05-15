const { REST, Routes } = require('discord.js');
const config = require('./config/config');

const rest = new REST().setToken(config.token);

(async () => {
    try {
        console.log('Started clearing global application (/) commands...');

        // Passing an empty array to PUT deletes all global commands
        await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: [] },
        );

        console.log('Successfully deleted all global application (/) commands.');
        console.log('Note: It may take a few minutes for Discord to update your client and hide them.');
    } catch (error) {
        console.error(error);
    }
})();
