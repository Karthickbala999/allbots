const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume the paused track'),
    async execute(interaction, client) {
        const player = client.manager.players.get(interaction.guild.id);
        
        if (!player) return interaction.reply({ content: '❌ There is no music playing.', ephemeral: true });
        
        const { channel } = interaction.member.voice;
        if (!channel || channel.id !== player.voiceId) {
            return interaction.reply({ content: '❌ You need to be in the same voice channel as the bot to use this command.', ephemeral: true });
        }

        if (!player.paused) return interaction.reply({ content: '❌ The music is not paused.', ephemeral: true });

        player.pause(false);
        return interaction.reply({ content: '▶ Resumed the music.' });
    }
};
