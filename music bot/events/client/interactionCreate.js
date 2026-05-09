const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) return;

            try {
                await command.execute(interaction, client);
            } catch (error) {
                client.logger.error(`Error executing ${interaction.commandName}: ${error}`);
                const embed = new EmbedBuilder()
                    .setColor('Red')
                    .setDescription('❌ There was an error while executing this command!');
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ embeds: [embed], ephemeral: true });
                } else {
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                }
            }
        } else if (interaction.isButton()) {
            const player = client.manager.players.get(interaction.guildId);
            if (!player) return interaction.reply({ content: 'No active player in this server.', ephemeral: true });

            const memberVoice = interaction.member.voice.channelId;
            if (!memberVoice || memberVoice !== player.voiceId) {
                return interaction.reply({ content: 'You need to be in the same voice channel as the bot to use these buttons.', ephemeral: true });
            }

            try {
                switch (interaction.customId) {
                    case 'playpause':
                        player.pause(!player.paused);
                        await interaction.reply({ content: player.paused ? '⏸ Paused the music.' : '▶ Resumed the music.', ephemeral: true });
                        break;
                    case 'previous':
                        const previousTrack = player.queue.previous;
                        if (!previousTrack) {
                            await interaction.reply({ content: '❌ There is no previous track.', ephemeral: true });
                            return;
                        }
                        player.queue.unshift(previousTrack);
                        player.skip();
                        await interaction.reply({ content: '⏮ Playing previous track.', ephemeral: true });
                        break;
                    case 'loop':
                        const loopMap = { 'none': 'track', 'track': 'queue', 'queue': 'none' };
                        const loopNames = { 'none': 'Off', 'track': 'Track', 'queue': 'Queue' };
                        const currentLoop = player.loop;
                        const nextLoop = loopMap[currentLoop];
                        player.setLoop(nextLoop);
                        await interaction.reply({ content: `🔁 Loop set to: **${loopNames[nextLoop]}**`, ephemeral: true });
                        break;
                    case 'shuffle':
                        player.queue.shuffle();
                        await interaction.reply({ content: '🔀 Shuffled the queue.', ephemeral: true });
                        break;
                    case 'skip':
                        player.skip();
                        await interaction.reply({ content: '⏭ Skipped the current track.', ephemeral: true });
                        break;
                    case 'stop':
                        player.destroy();
                        await interaction.reply({ content: '⏹ Stopped the music and left the channel.', ephemeral: true });
                        break;
                    case 'voldown':
                        let volDown = Math.max(10, player.volume * 100 - 10);
                        player.setVolume(volDown);
                        await interaction.reply({ content: `🔉 Volume set to ${volDown}%`, ephemeral: true });
                        break;
                    case 'volup':
                        let volUp = Math.min(100, player.volume * 100 + 10);
                        player.setVolume(volUp);
                        await interaction.reply({ content: `🔊 Volume set to ${volUp}%`, ephemeral: true });
                        break;
                }
            } catch (error) {
                client.logger.error(`Button Interaction Error: ${error}`);
            }
        }
    },
};
