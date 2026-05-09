const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

function loadCommands(client) {
    const commandsArray = [];
    const commandsPath = path.join(__dirname, '../commands');
    
    if (!fs.existsSync(commandsPath)) {
        fs.mkdirSync(commandsPath);
    }

    const commandFolders = fs.readdirSync(commandsPath);

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        if (fs.lstatSync(folderPath).isDirectory()) {
            const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                const filePath = path.join(folderPath, file);
                const command = require(filePath);
                
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    commandsArray.push(command.data.toJSON());
                } else {
                    client.logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
                }
            }
        }
    }

    client.on('clientReady', async () => {
        const rest = new REST({ version: '10' }).setToken(client.config.token);
        try {
            client.logger.info(`Started refreshing ${commandsArray.length} application (/) commands.`);
            await rest.put(
                Routes.applicationCommands(client.config.clientId),
                { body: commandsArray },
            );
            client.logger.success(`Successfully reloaded application (/) commands.`);
        } catch (error) {
            client.logger.error(`Error reloading commands: ${error}`);
        }
    });
}

module.exports = { loadCommands };
