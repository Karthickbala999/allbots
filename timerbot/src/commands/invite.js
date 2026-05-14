'use strict';

const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');

require('dotenv').config();
const CLIENT_ID = process.env.CLIENT_ID;

// Required permissions for the bot to function correctly
const PERMISSIONS = '536938512';

const INVITE_URL = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&permissions=${PERMISSIONS}&scope=bot%20applications.commands`;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('📨  Get the invite link to add this bot to your server'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`${interaction.client.user.username}`)
      .setThumbnail(interaction.client.user.displayAvatarURL({ size: 256 }))
      .setDescription(
        [
          '> ⏰  **Automatic VC lock/unlock for tournaments**',
          '> 📅  Schedule daily open/close timers',
          '> 🔔  Role mention announcements',
          '> 🔒  Manual lock & unlock controls',
          '',
          'Click the button below to add me to your server!',
        ].join('\n')
      )
      .setFooter({ text: 'Timer Bot  •  Tournament VC Manager' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Add to Server')
        .setEmoji('➕')
        .setStyle(ButtonStyle.Link)
        .setURL(INVITE_URL)
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
    });
  },
};
