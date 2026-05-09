const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song or playlist from YouTube, Spotify, or SoundCloud')
        .addStringOption(option => 
            option.setName('query')
                .setDescription('The song name or URL to play')
                .setRequired(true)
        ),
    async execute(interaction, client) {
        const query = interaction.options.getString('query');
        const { channel } = interaction.member.voice;

        let player = client.manager.players.get(interaction.guild.id);
        const botChannel = interaction.guild.members.me.voice.channel;

        if (!channel && !player) {
            return interaction.reply({ content: '❌ You must be in a voice channel to play music.', ephemeral: true });
        }

        if (channel && botChannel && channel.id !== botChannel.id) {
            return interaction.reply({ content: `❌ I'm already playing in ${botChannel}.`, ephemeral: true });
        }

        await interaction.deferReply();

        if (!player) {
            player = await client.manager.createPlayer({
                guildId: interaction.guild.id,
                textId: interaction.channel.id,
                voiceId: channel.id,
                volume: 100,
                deaf: true
            });
        }

        const res = await client.manager.search(query, { requester: interaction.user });
        
        if (!res.tracks.length) {
            if (!player.playing && !player.queue.length) player.destroy();
            return interaction.editReply({ content: '❌ No results found.' });
        }

        const embed = new EmbedBuilder().setColor(client.config.embedColor);

        if (res.type === 'PLAYLIST') {
            for (let track of res.tracks) {
                player.queue.add(track);
            }
            embed.setDescription(`✅ Added **${res.playlistName}** (${res.tracks.length} tracks) to the queue.`);
        } else {
            player.queue.add(res.tracks[0]);
            embed.setDescription(`✅ Added **[${res.tracks[0].title}](${res.tracks[0].uri})** to the queue.`);
        }

        if (!player.playing && !player.paused) {
            player.play();
        }

        return interaction.editReply({ embeds: [embed] });
    }
};
