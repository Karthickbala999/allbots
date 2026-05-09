const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove a specific track from the queue')
        .addIntegerOption(option => 
            option.setName('position')
                .setDescription('The position of the track in the queue')
                .setRequired(true)
                .setMinValue(1)
        ),
    async execute(interaction, client) {
        const position = interaction.options.getInteger('position');
        const player = client.manager.players.get(interaction.guild.id);
        
        if (!player || !player.queue.length) {
            return interaction.reply({ content: '❌ The queue is empty.', ephemeral: true });
        }
        
        const { channel } = interaction.member.voice;
        if (!channel || channel.id !== player.voiceId) {
            return interaction.reply({ content: '❌ You need to be in the same voice channel as the bot to use this command.', ephemeral: true });
        }

        if (position > player.queue.length) {
            return interaction.reply({ content: `❌ Position must be between 1 and ${player.queue.length}.`, ephemeral: true });
        }

        const removedTrack = player.queue[position - 1];
        player.queue.remove(position - 1);
        
        return interaction.reply({ content: `🗑 Removed **${removedTrack.title}** from the queue.` });
    }
};
