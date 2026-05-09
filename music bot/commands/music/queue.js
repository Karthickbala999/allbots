const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { formatDuration } = require('../../player/kazagumo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Display the current music queue'),
    async execute(interaction, client) {
        const player = client.manager.players.get(interaction.guild.id);
        
        if (!player || !player.queue.current) {
            return interaction.reply({ content: '❌ There is no music playing.', ephemeral: true });
        }

        const current = player.queue.current;
        const queue = player.queue;
        
        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle(`Queue for ${interaction.guild.name}`)
            .setDescription(`**Now Playing:**\n[${current.title}](${current.uri}) - \`${formatDuration(current.length)}\` | Requested by: <@${current.requester.id}>`);

        if (queue.length) {
            const tracks = queue.slice(0, 10).map((track, index) => {
                return `**${index + 1}.** [${track.title}](${track.uri}) - \`${formatDuration(track.length)}\` | <@${track.requester.id}>`;
            }).join('\n');
            embed.addFields({ name: 'Up Next:', value: tracks });

            if (queue.length > 10) {
                embed.setFooter({ text: `And ${queue.length - 10} more...` });
            }
        }

        return interaction.reply({ embeds: [embed] });
    }
};
