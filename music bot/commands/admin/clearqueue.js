const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clearqueue')
        .setDescription('Clear the current music queue')
        .setDefaultMemberPermissions(8), // Require Administrator or manage roles for default
    async execute(interaction, client) {
        const player = client.manager.players.get(interaction.guild.id);
        
        if (!player || !player.queue.length) {
            return interaction.reply({ content: '❌ The queue is already empty.', ephemeral: true });
        }
        
        const { channel } = interaction.member.voice;
        if (!channel || channel.id !== player.voiceId) {
            return interaction.reply({ content: '❌ You need to be in the same voice channel as the bot to use this command.', ephemeral: true });
        }

        player.queue.clear();
        return interaction.reply({ content: '🗑 Cleared the music queue.' });
    }
};
