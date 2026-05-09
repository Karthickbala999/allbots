const { Connectors } = require('shoukaku');
const { Kazagumo, Plugins } = require('kazagumo');
const KazagumoSpotify = require('kazagumo-spotify');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function initPlayer(client) {
    const Nodes = client.config.lavalink;

    const plugins = [];
    if (client.config.spotify.clientId && client.config.spotify.clientSecret) {
        plugins.push(new KazagumoSpotify({
            clientId: client.config.spotify.clientId,
            clientSecret: client.config.spotify.clientSecret,
            playlistPageLimit: 5,
            albumPageLimit: 5,
            searchLimit: 10,
            searchMarket: 'US',
        }));
    }

    plugins.push(new Plugins.PlayerMoved(client));

    client.manager = new Kazagumo({
        defaultSearchEngine: "youtube_music",
        plugins: plugins,
        send: (guildId, payload) => {
            const guild = client.guilds.cache.get(guildId);
            if (guild) guild.shard.send(payload);
        }
    }, new Connectors.DiscordJS(client), Nodes, {
        moveOnDisconnect: false,
        resume: true,
        reconnectTries: 5,
        restTimeout: 10000
    });

    client.manager.shoukaku.on('ready', async (name) => {
        client.logger.success(`Lavalink Node: ${name} is now ready!`);
    });

    client.manager.shoukaku.on('error', (name, error) => {
        client.logger.error(`Lavalink Node: ${name} emitted an error. ${error}`);
    });

    client.manager.shoukaku.on('close', (name, code, reason) => {
        client.logger.warn(`Lavalink Node: ${name} closed with code ${code}. Reason: ${reason || 'No reason'}`);
    });

    client.manager.shoukaku.on('disconnect', (name, players, moved) => {
        if (moved) return;
        players.map(player => player.connection.disconnect());
        client.logger.warn(`Lavalink Node: ${name} disconnected`);
    });

    // Kazagumo Events
    client.manager.on("playerStart", async (player, track) => {
        const channel = client.channels.cache.get(player.textId);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle('🎶 Now Playing')
            .setDescription(`**[${track.title}](${track.uri})**`)
            .addFields(
                { name: 'Author', value: track.author, inline: true },
                { name: 'Duration', value: formatDuration(track.length), inline: true },
                { name: 'Requested by', value: `<@${track.requester.id}>`, inline: true }
            )
            .setThumbnail(track.thumbnail || 'https://i.imgur.com/8Qj7v0v.png');

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('previous').setEmoji('⏮').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('playpause').setEmoji('⏯').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('skip').setEmoji('⏭').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('loop').setEmoji('🔁').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('stop').setEmoji('⏹').setStyle(ButtonStyle.Danger)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('voldown').setEmoji('🔉').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('shuffle').setEmoji('🔀').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('volup').setEmoji('🔊').setStyle(ButtonStyle.Secondary)
        );

        const msg = await channel.send({ embeds: [embed], components: [row1, row2] });
        player.data.set('message', msg);
    });

    client.manager.on("playerResolveError", (player, track, message) => {
        client.logger.error(`Resolve error on track ${track.title}: ${message}`);
        const channel = client.channels.cache.get(player.textId);
        if (channel) channel.send({ content: `❌ Error resolving track: ${track.title}` }).then(m => setTimeout(() => m.delete().catch(()=>null), 5000));
    });

    client.manager.on("playerEnd", async (player) => {
        if (player.queue.length === 0 && player.data.get('autoplay')) {
            try {
                const previous = player.queue.previous;
                if (!previous) return;
                
                const search = `https://www.youtube.com/watch?v=${previous.identifier}&list=RD${previous.identifier}`;
                const res = await client.manager.search(search, { requester: client.user });
                
                if (res.tracks.length > 1) {
                    player.queue.add(res.tracks[1]); // Next track in mix
                }
            } catch (e) {
                client.logger.error(`Autoplay Error: ${e}`);
            }
        }
    });

    client.manager.on("playerDestroy", (player) => {
        const channel = client.channels.cache.get(player.textId);
        if (channel) {
            const leaveEmbed = new EmbedBuilder()
                .setColor('#A855F7')
                .setDescription('⚔️ NA PAATU PAADRATHA KEKA YARUM ILLA — NA POREN BYE 👋\n\n💨 **Mikasa is leaving the battlefield. Bye 👋**\n\n🎧 **Want me back?**\n\n> `m/p <song name or YouTube/Spotify link>`\n\n🔥 *Summon the music again anytime.*');
            channel.send({ embeds: [leaveEmbed] });
        }
        client.logger.info(`Player destroyed for guild ${player.guildId}`);
    });

    client.manager.on("playerEmpty", async (player) => {
        const channel = client.channels.cache.get(player.textId);
        if (channel) channel.send({ content: 'Queue has ended.' }).then(m => setTimeout(() => m.delete().catch(()=>null), 5000));
        
        let is247 = false;
        if (client.config.mongoUri) {
            const Guild = require('../database/schema/Guild');
            const guildData = await Guild.findOne({ guildId: player.guildId });
            if (guildData && guildData.twentyFourSeven) is247 = true;
        }

        if (!is247) {
            setTimeout(() => {
                if (!player.playing && player.queue.length === 0) {
                    player.destroy();
                }
            }, 60000); // Wait 1 min before leaving
        }
    });
}

function formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
}

module.exports = { initPlayer, formatDuration };
