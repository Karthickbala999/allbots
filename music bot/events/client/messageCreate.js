const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { formatDuration } = require('../../player/kazagumo');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        const prefix = 'm/';
        if (!message.content.toLowerCase().startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const { channel } = message.member.voice;
        let player = client.manager.players.get(message.guild.id);
        const botChannel = message.guild.members.me.voice.channel;

        // Command Aliases Map
        const cmdMap = {
            'j': 'join', 'join': 'join',
            'p': 'play', 'play': 'play',
            's': 'skip', 'skip': 'skip',
            'stop': 'stop',
            'q': 'queue', 'queue': 'queue',
            'np': 'nowplaying', 'nowplaying': 'nowplaying',
            'v': 'volume', 'volume': 'volume',
            'pause': 'pause',
            'resume': 'resume',
            'invite': 'invite'
        };

        let cmd = cmdMap[commandName];

        // If the command is a number (e.g. m/90), treat it as a volume command
        if (!cmd && !isNaN(commandName)) {
            const vol = parseInt(commandName);
            if (vol >= 1 && vol <= 100) {
                cmd = 'volume';
                args.unshift(commandName);
            }
        }

        if (!cmd) return;

        // Voice Checks for Music Commands
        if (cmd !== 'invite') {
            if (!channel && !player) {
                return message.reply('❌ You must be in a voice channel to play music.');
            }

            if (channel && botChannel && channel.id !== botChannel.id) {
                return message.reply(`❌ I'm already playing in ${botChannel}.`);
            }
        }

        try {
            switch (cmd) {
                case 'invite':
                    const inviteLink = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&integration_type=0&scope=bot+applications.commands`;
                    message.delete().catch(() => null);
                    
                    const invEmbed = new EmbedBuilder()
                        .setColor('#2B2D31')
                        .setDescription(`**Invite: [${client.user.tag}](${inviteLink})**`)
                        .setImage(client.user.displayAvatarURL({ size: 1024, extension: 'png' }));

                    const invRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setLabel('Join')
                            .setStyle(ButtonStyle.Link)
                            .setURL(inviteLink)
                    );

                    return message.channel.send({ embeds: [invEmbed], components: [invRow] });

                case 'join':
                    if (!channel) return message.channel.send('❌ You must be in a voice channel for me to join you.');
                    if (player) return message.channel.send('❌ I am already connected to a voice channel.');
                    player = await client.manager.createPlayer({
                        guildId: message.guild.id,
                        textId: message.channel.id,
                        voiceId: channel.id,
                        volume: 100,
                        deaf: true
                    });
                    message.delete().catch(() => null);
                    const joinCmdEmbed = new EmbedBuilder()
                        .setColor(client.config.embedColor)
                        .setDescription(`☠️ **Titans outside. Absolute bangers inside.** 💜\n\n✅ Successfully joined **${channel.name}**`);
                    return message.channel.send({ embeds: [joinCmdEmbed] });

                case 'play':
                    const query = args.join(' ');
                    if (!query) return message.channel.send('❌ Please provide a song name or URL.');

                    if (!player) {
                        player = await client.manager.createPlayer({
                            guildId: message.guild.id,
                            textId: message.channel.id,
                            voiceId: channel ? channel.id : botChannel.id,
                            volume: 100,
                            deaf: true
                        });
                        const joinEmbed = new EmbedBuilder()
                            .setColor(client.config.embedColor)
                            .setDescription("☠️ **Titans outside. Absolute bangers inside.** 💜");
                        message.channel.send({ embeds: [joinEmbed] });
                    }

                    const res = await client.manager.search(query, { requester: message.author });
                    if (!res || !res.tracks || !res.tracks.length) {
                        if (player && !player.playing && !player.queue.length) player.destroy();
                        return message.channel.send('❌ No results found or search was blocked.');
                    }

                    const embed = new EmbedBuilder().setColor(client.config.embedColor);

                    if (res.type === 'PLAYLIST') {
                        for (let track of res.tracks) player.queue.add(track);
                        embed.setDescription(`✅ Added **${res.playlistName}** (${res.tracks.length} tracks) to the queue.`);
                    } else {
                        player.queue.add(res.tracks[0]);
                        embed.setDescription(`✅ Added **[${res.tracks[0].title}](${res.tracks[0].uri})** to the queue.`);
                    }

                    if (!player.playing && !player.paused) player.play();
                    message.delete().catch(() => null);
                    return message.channel.send({ embeds: [embed] });

                case 'skip':
                    if (!player) return message.channel.send('❌ There is no music playing.');
                    player.skip();
                    message.delete().catch(() => null);
                    return message.channel.send('⏭ Skipped the current track.');

                case 'stop':
                    if (!player) return message.channel.send('❌ There is no music playing.');
                    player.destroy();
                    message.delete().catch(() => null);
                    return;

                case 'pause':
                    if (!player) return message.channel.send('❌ There is no music playing.');
                    if (player.paused) return message.channel.send('❌ The music is already paused.');
                    player.pause(true);
                    message.delete().catch(() => null);
                    return message.channel.send('⏸ Paused the music.');

                case 'resume':
                    if (!player) return message.channel.send('❌ There is no music playing.');
                    if (!player.paused) return message.channel.send('❌ The music is not paused.');
                    player.pause(false);
                    message.delete().catch(() => null);
                    return message.channel.send('▶ Resumed the music.');

                case 'volume':
                    if (!player) return message.channel.send('❌ There is no music playing.');
                    const amount = parseInt(args[0]);
                    if (!amount || amount < 1 || amount > 100) return message.channel.send('❌ Please provide a valid volume between 1 and 100.');
                    player.setVolume(amount);
                    message.delete().catch(() => null);
                    return message.channel.send(`🔊 Volume set to ${amount}%`);

                case 'queue':
                    if (!player || !player.queue.current) return message.channel.send('❌ There is no music playing.');
                    const current = player.queue.current;
                    const qEmbed = new EmbedBuilder()
                        .setColor(client.config.embedColor)
                        .setTitle(`Queue for ${message.guild.name}`)
                        .setDescription(`**Now Playing:**\n[${current.title}](${current.uri}) - \`${formatDuration(current.length)}\` | Requested by: <@${current.requester.id}>`);
                    
                    if (player.queue.length) {
                        const tracks = player.queue.slice(0, 10).map((track, i) => `**${i + 1}.** [${track.title}](${track.uri}) - \`${formatDuration(track.length)}\` | <@${track.requester.id}>`).join('\n');
                        qEmbed.addFields({ name: 'Up Next:', value: tracks });
                    }
                    message.delete().catch(() => null);
                    return message.channel.send({ embeds: [qEmbed] });

                case 'nowplaying':
                    if (!player || !player.queue.current) return message.channel.send('❌ There is no music playing.');
                    const trk = player.queue.current;
                    const pos = player.position;
                    const dur = trk.length;
                    const size = 20;
                    const currentProgress = Math.round((pos / dur) * size);
                    const emptyProgress = size - currentProgress;
                    const progressBar = '▬'.repeat(currentProgress) + '🔘' + '▬'.repeat(emptyProgress);
                    
                    const npEmbed = new EmbedBuilder()
                        .setColor(client.config.embedColor)
                        .setTitle('🎶 Now Playing')
                        .setDescription(`**[${trk.title}](${trk.uri})**`)
                        .addFields(
                            { name: 'Author', value: trk.author, inline: true },
                            { name: 'Requested by', value: `<@${trk.requester.id}>`, inline: true },
                            { name: 'Progress', value: `\`${formatDuration(pos)}\` ${progressBar} \`${formatDuration(dur)}\`` }
                        )
                        .setThumbnail(trk.thumbnail || 'https://i.imgur.com/8Qj7v0v.png');
                    message.delete().catch(() => null);
                    return message.channel.send({ embeds: [npEmbed] });
            }
        } catch (error) {
            client.logger.error(`Message Command Error: ${error}`);
            message.channel.send('❌ An error occurred while executing that command.');
        }
    }
};
