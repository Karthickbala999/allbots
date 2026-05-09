const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoplay')
        .setDescription('Toggle autoplay for related tracks'),
    async execute(interaction, client) {
        const player = client.manager.players.get(interaction.guild.id);
        
        if (!player) return interaction.reply({ content: '❌ There is no music playing.', ephemeral: true });
        
        const { channel } = interaction.member.voice;
        if (!channel || channel.id !== player.voiceId) {
            return interaction.reply({ content: '❌ You need to be in the same voice channel as the bot to use this command.', ephemeral: true });
        }

        const autoplay = player.data.get('autoplay') || false;
        
        if (autoplay) {
            player.data.set('autoplay', false);
            return interaction.reply({ content: '📻 Autoplay has been disabled.' });
        } else {
            player.data.set('autoplay', true);
            
            // If the queue is empty, trigger an event manually to add a track right away
            if (!player.queue.length && player.queue.current) {
                const current = player.queue.current;
                const search = `https://www.youtube.com/watch?v=${current.identifier}&list=RD${current.identifier}`;
                const res = await client.manager.search(search, { requester: client.user });
                if (res.tracks.length) {
                    player.queue.add(res.tracks[1] || res.tracks[0]);
                }
            }
            
            return interaction.reply({ content: '📻 Autoplay has been enabled.' });
        }
    }
};
