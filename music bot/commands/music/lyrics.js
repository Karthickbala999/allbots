const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lyrics')
        .setDescription('Get lyrics for the currently playing song or a specific song')
        .addStringOption(option => 
            option.setName('query')
                .setDescription('The song to search lyrics for')
                .setRequired(false)
        ),
    async execute(interaction, client) {
        let query = interaction.options.getString('query');
        const player = client.manager.players.get(interaction.guild.id);
        
        if (!query) {
            if (!player || !player.queue.current) {
                return interaction.reply({ content: '❌ There is no music playing and no query was provided.', ephemeral: true });
            }
            query = player.queue.current.title;
        }

        await interaction.deferReply();

        try {
            // using a public free lyrics API (some-random-api)
            const response = await fetch(`https://some-random-api.com/lyrics?title=${encodeURIComponent(query)}`);
            const data = await response.json();

            if (!data || !data.lyrics) {
                return interaction.editReply({ content: '❌ No lyrics found for that song.' });
            }

            const embed = new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setTitle(`Lyrics for ${data.title} by ${data.author}`)
                .setDescription(data.lyrics.substring(0, 4096))
                .setThumbnail(data.thumbnail.genius || null);

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            client.logger.error(`Lyrics error: ${error}`);
            return interaction.editReply({ content: '❌ An error occurred while fetching lyrics.' });
        }
    }
};
