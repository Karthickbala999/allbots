const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Loop the current track or queue')
        .addStringOption(option => 
            option.setName('mode')
                .setDescription('The loop mode')
                .setRequired(true)
                .addChoices(
                    { name: 'Off', value: 'none' },
                    { name: 'Track', value: 'track' },
                    { name: 'Queue', value: 'queue' }
                )
        ),
    async execute(interaction, client) {
        const mode = interaction.options.getString('mode');
        const player = client.manager.players.get(interaction.guild.id);
        
        if (!player) return interaction.reply({ content: '❌ There is no music playing.', ephemeral: true });
        
        const { channel } = interaction.member.voice;
        if (!channel || channel.id !== player.voiceId) {
            return interaction.reply({ content: '❌ You need to be in the same voice channel as the bot to use this command.', ephemeral: true });
        }

        if (mode === 'none') {
            player.setLoop('none');
            return interaction.reply({ content: '🔁 Loop disabled.' });
        } else if (mode === 'track') {
            player.setLoop('track');
            return interaction.reply({ content: '🔂 Looping the current track.' });
        } else if (mode === 'queue') {
            player.setLoop('queue');
            return interaction.reply({ content: '🔁 Looping the entire queue.' });
        }
    }
};
