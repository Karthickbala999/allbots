const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { formatDuration } = require('../../player/kazagumo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Show details of the currently playing song'),
    async execute(interaction, client) {
        const player = client.manager.players.get(interaction.guild.id);
        
        if (!player || !player.queue.current) {
            return interaction.reply({ content: '❌ There is no music playing.', ephemeral: true });
        }

        const track = player.queue.current;
        const position = player.position;
        const duration = track.length;
        
        // Progress bar calculation
        const size = 20;
        const currentProgress = Math.round((position / duration) * size);
        const emptyProgress = size - currentProgress;
        
        const progressBar = '▬'.repeat(currentProgress) + '🔘' + '▬'.repeat(emptyProgress);

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle('🎶 Now Playing')
            .setDescription(`**[${track.title}](${track.uri})**`)
            .addFields(
                { name: 'Author', value: track.author, inline: true },
                { name: 'Requested by', value: `<@${track.requester.id}>`, inline: true },
                { name: 'Progress', value: `\`${formatDuration(position)}\` ${progressBar} \`${formatDuration(duration)}\`` }
            )
            .setThumbnail(track.thumbnail || 'https://i.imgur.com/8Qj7v0v.png');

        return interaction.reply({ embeds: [embed] });
    }
};
