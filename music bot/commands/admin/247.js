const { SlashCommandBuilder } = require('discord.js');
const Guild = require('../../database/schema/Guild');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('247')
        .setDescription('Toggle 24/7 mode in the voice channel')
        .setDefaultMemberPermissions(8),
    async execute(interaction, client) {
        if (!client.config.mongoUri) {
            return interaction.reply({ content: '❌ MongoDB is not configured. This feature is disabled.', ephemeral: true });
        }

        const player = client.manager.players.get(interaction.guild.id);
        const { channel } = interaction.member.voice;
        
        if (!channel) {
            return interaction.reply({ content: '❌ You need to be in a voice channel to enable 24/7.', ephemeral: true });
        }

        let guildData = await Guild.findOne({ guildId: interaction.guild.id });
        if (!guildData) {
            guildData = new Guild({ guildId: interaction.guild.id });
        }

        if (guildData.twentyFourSeven) {
            guildData.twentyFourSeven = false;
            guildData.voiceChannel = null;
            guildData.textChannel = null;
            await guildData.save();
            return interaction.reply({ content: '🔴 24/7 mode disabled.' });
        } else {
            guildData.twentyFourSeven = true;
            guildData.voiceChannel = channel.id;
            guildData.textChannel = interaction.channel.id;
            await guildData.save();
            
            if (!player) {
                await client.manager.createPlayer({
                    guildId: interaction.guild.id,
                    textId: interaction.channel.id,
                    voiceId: channel.id,
                    volume: 100,
                    deaf: true
                });
            }
            
            return interaction.reply({ content: '🟢 24/7 mode enabled in this channel.' });
        }
    }
};
