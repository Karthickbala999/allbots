const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Set the volume of the player')
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('The volume amount (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),
    async execute(interaction, client) {
        const amount = interaction.options.getInteger('amount');
        const player = client.manager.players.get(interaction.guild.id);
        
        if (!player) return interaction.reply({ content: '❌ There is no music playing.', ephemeral: true });
        
        const { channel } = interaction.member.voice;
        if (!channel || channel.id !== player.voiceId) {
            return interaction.reply({ content: '❌ You need to be in the same voice channel as the bot to use this command.', ephemeral: true });
        }

        player.setVolume(amount);
        return interaction.reply({ content: `🔊 Volume set to ${amount}%` });
    }
};
