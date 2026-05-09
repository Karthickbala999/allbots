const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('filter')
        .setDescription('Apply a filter to the music')
        .addStringOption(option => 
            option.setName('type')
                .setDescription('The filter to apply')
                .setRequired(true)
                .addChoices(
                    { name: 'None', value: 'none' },
                    { name: 'Bassboost', value: 'bassboost' },
                    { name: 'Nightcore', value: 'nightcore' },
                    { name: 'Vaporwave', value: 'vaporwave' },
                    { name: '8D', value: '8d' },
                    { name: 'Karaoke', value: 'karaoke' },
                    { name: 'Tremolo', value: 'tremolo' },
                    { name: 'Vibrato', value: 'vibrato' }
                )
        ),
    async execute(interaction, client) {
        const type = interaction.options.getString('type');
        const player = client.manager.players.get(interaction.guild.id);
        
        if (!player) return interaction.reply({ content: '❌ There is no music playing.', ephemeral: true });
        
        const { channel } = interaction.member.voice;
        if (!channel || channel.id !== player.voiceId) {
            return interaction.reply({ content: '❌ You need to be in the same voice channel as the bot to use this command.', ephemeral: true });
        }

        try {
            switch (type) {
                case 'none':
                    player.shoukaku.clearFilters();
                    break;
                case 'bassboost':
                    player.shoukaku.setFilters({
                        equalizer: [
                            { band: 0, gain: 0.6 },
                            { band: 1, gain: 0.67 },
                            { band: 2, gain: 0.67 },
                            { band: 3, gain: 0.4 },
                            { band: 4, gain: 0.15 },
                            { band: 5, gain: 0.05 },
                            { band: 6, gain: -0.05 },
                            { band: 7, gain: -0.1 },
                            { band: 8, gain: -0.1 },
                            { band: 9, gain: -0.1 },
                            { band: 10, gain: -0.1 },
                            { band: 11, gain: -0.1 },
                            { band: 12, gain: -0.1 },
                            { band: 13, gain: -0.1 }
                        ]
                    });
                    break;
                case 'nightcore':
                    player.shoukaku.setFilters({
                        timescale: { speed: 1.2, pitch: 1.2, rate: 1 }
                    });
                    break;
                case 'vaporwave':
                    player.shoukaku.setFilters({
                        timescale: { speed: 0.85, pitch: 0.8, rate: 1 }
                    });
                    break;
                case '8d':
                    player.shoukaku.setFilters({
                        rotation: { rotationHz: 0.2 }
                    });
                    break;
                case 'karaoke':
                    player.shoukaku.setFilters({
                        karaoke: { level: 1, monoLevel: 1, filterBand: 220, filterWidth: 100 }
                    });
                    break;
                case 'tremolo':
                    player.shoukaku.setFilters({
                        tremolo: { frequency: 2, depth: 0.5 }
                    });
                    break;
                case 'vibrato':
                    player.shoukaku.setFilters({
                        vibrato: { frequency: 2, depth: 0.5 }
                    });
                    break;
            }
            return interaction.reply({ content: `🎵 Filter set to: **${type}**` });
        } catch (error) {
            client.logger.error(error);
            return interaction.reply({ content: '❌ Failed to apply filter.', ephemeral: true });
        }
    }
};
