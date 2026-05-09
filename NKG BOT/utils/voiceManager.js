const { 
    joinVoiceChannel, 
    VoiceConnectionStatus, 
    createAudioPlayer, 
    createAudioResource, 
    AudioPlayerStatus, 
    entersState,
    StreamType 
} = require('@discordjs/voice');
const { Readable } = require('stream');
const config = require('../config/config');
const logger = require('./logger');

let connection = null;
let player = null;
let reconnectTimeout = null;
let isConnecting = false;
const intentionalDestroys = new WeakSet();

function clearReconnectTimeout() {
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }
}

function destroyVoiceConnection(voiceConnection, intentional = false) {
    if (!voiceConnection || voiceConnection.state.status === VoiceConnectionStatus.Destroyed) return;

    if (intentional) {
        intentionalDestroys.add(voiceConnection);
    }

    voiceConnection.destroy();
}

/**
 * Creates a silence stream to keep the connection alive
 */
function createSilenceStream() {
    return new Readable({
        read() {
            setTimeout(() => {
                this.push(Buffer.from([0xF8, 0xFF, 0xFE]));
            }, 20);
        }
    });
}

/**
 * Main function to join the voice channel and maintain connection
 */
async function joinVC(client) {
    if (isConnecting) return;
    isConnecting = true;
    clearReconnectTimeout();

    if (!config.voiceChannelId || !config.guildId) {
        logger.error('VOICE_CHANNEL_ID or GUILD_ID is missing in .env');
        isConnecting = false;
        return;
    }

    try {
        const guild = await client.guilds.fetch(config.guildId).catch(() => null);
        if (!guild) {
            logger.error(`Guild not found (${config.guildId})`);
            isConnecting = false;
            return;
        }

        const channel = await guild.channels.fetch(config.voiceChannelId).catch(() => null);
        if (!channel || !channel.isVoiceBased()) {
            logger.error(`Voice channel not found or invalid (${config.voiceChannelId})`);
            isConnecting = false;
            return;
        }

        // Replace any stale connection without triggering the reconnect watchdog.
        if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) {
            destroyVoiceConnection(connection, true);
        }

        const activeConnection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: false,
        });
        connection = activeConnection;

        if (!player) {
            player = createAudioPlayer();
            
            player.on(AudioPlayerStatus.Idle, () => {
                const resource = createAudioResource(createSilenceStream(), {
                    inputType: StreamType.Opus,
                });
                player.play(resource);
            });

            player.on('error', (error) => {
                if (!error.message.includes('EPIPE')) {
                    logger.error(`[PLAYER ERROR] ${error.message}`);
                }
            });
        }

        activeConnection.subscribe(player);
        
        // Start playing silence
        const resource = createAudioResource(createSilenceStream(), {
            inputType: StreamType.Opus,
        });
        player.play(resource);

        // Handle Disconnection
        activeConnection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
            try {
                await Promise.race([
                    entersState(activeConnection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(activeConnection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
            } catch (e) {
                logger.warn('Disconnected from VC, attempting to rejoin in 5s...');
                if (connection === activeConnection) {
                    connection = null;
                }
                destroyVoiceConnection(activeConnection, true);
                scheduleRejoin(client);
            }
        });

        activeConnection.on(VoiceConnectionStatus.Destroyed, () => {
            if (intentionalDestroys.has(activeConnection)) {
                intentionalDestroys.delete(activeConnection);
                return;
            }

            if (connection === activeConnection) {
                connection = null;
            }

            logger.warn('Connection destroyed, re-initializing...');
            scheduleRejoin(client);
        });

        activeConnection.on('error', (error) => {
            logger.error(`[CONNECTION ERROR] ${error.message}`);
            destroyVoiceConnection(activeConnection);
        });

        logger.info(`[24/7 VC] Successfully connected to: ${channel.name}`);
        isConnecting = false;

    } catch (error) {
        logger.error(`[VC JOIN ERROR] ${error.message}`);
        isConnecting = false;
        scheduleRejoin(client);
    }
}

function scheduleRejoin(client) {
    clearReconnectTimeout();
    reconnectTimeout = setTimeout(() => {
        reconnectTimeout = null;
        joinVC(client);
    }, 5000);
}

/**
 * Health check to ensure bot is still in the correct channel
 */
function startWatchdog(client) {
    setInterval(async () => {
        try {
            const guild = client.guilds.cache.get(config.guildId);
            if (!guild) return;

            const botMember = guild.members.me || await guild.members.fetch(client.user.id).catch(() => null);
            if (!botMember) return;

            const currentChannelId = botMember.voice.channelId;

            if (currentChannelId !== config.voiceChannelId) {
                logger.warn(`[WATCHDOG] Bot is in wrong channel (${currentChannelId}) or not in any channel. Rejoining...`);
                joinVC(client);
            } else if (!connection || connection.state.status === VoiceConnectionStatus.Destroyed || connection.state.status === VoiceConnectionStatus.Disconnected) {
                logger.warn(`[WATCHDOG] Connection state is invalid. Rejoining...`);
                joinVC(client);
            }
        } catch (error) {
            logger.error(`[WATCHDOG ERROR] ${error.message}`);
        }
    }, 30000); // Check every 30 seconds
}

module.exports = { joinVC, startWatchdog };
