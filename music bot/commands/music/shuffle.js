const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffle the current music queue'),
    async execute(interaction, client) {
        const player = client.manager.players.get(interaction.guild.id);
        
        if (!player || !player.queue.length) {
            return interaction.reply({ content: '❌ The queue is empty.', ephemeral: true });
        }
        
        const { channel } = interaction.member.voice;
        if (!channel || channel.id !== player.voiceId) {
            return interaction.reply({ content: '❌ You need to be in the same voice channel as the bot to use this command.', ephemeral: true });
        }

        player.queue.shuffle();
        return interaction.reply({ content: '🔀 Shuffled the queue.' });
    }
};
