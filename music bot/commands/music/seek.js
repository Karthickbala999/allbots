const { SlashCommandBuilder } = require('discord.js');
const { formatDuration } = require('../../player/kazagumo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('seek')
        .setDescription('Seek to a specific time in the current track')
        .addIntegerOption(option => 
            option.setName('seconds')
                .setDescription('The time in seconds to seek to')
                .setRequired(true)
                .setMinValue(0)
        ),
    async execute(interaction, client) {
        const seconds = interaction.options.getInteger('seconds');
        const player = client.manager.players.get(interaction.guild.id);
        
        if (!player || !player.queue.current) {
            return interaction.reply({ content: '❌ There is no music playing.', ephemeral: true });
        }
        
        const { channel } = interaction.member.voice;
        if (!channel || channel.id !== player.voiceId) {
            return interaction.reply({ content: '❌ You need to be in the same voice channel as the bot to use this command.', ephemeral: true });
        }

        if (!player.queue.current.isSeekable) {
            return interaction.reply({ content: '❌ This track is not seekable.', ephemeral: true });
        }

        const seekTime = seconds * 1000;
        if (seekTime > player.queue.current.length) {
            return interaction.reply({ content: `❌ Time cannot exceed track duration (\`${formatDuration(player.queue.current.length)}\`).`, ephemeral: true });
        }

        player.seek(seekTime);
        return interaction.reply({ content: `⏩ Seeked to \`${formatDuration(seekTime)}\`.` });
    }
};
