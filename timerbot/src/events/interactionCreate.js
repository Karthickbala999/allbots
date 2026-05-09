'use strict';

const logger = require('../utils/logger');
const { errorEmbed } = require('../utils/embeds');

module.exports = {
  name: 'interactionCreate',
  once: false,

  async execute(interaction) {
    // ── Autocomplete ─────────────────────────────────────────────────────
    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command?.autocomplete) return;
      try {
        await command.autocomplete(interaction);
      } catch (err) {
        logger.error(`[AUTOCOMPLETE] Error in ${interaction.commandName}:`, err);
      }
      return;
    }

    // ── Slash Commands ────────────────────────────────────────────────────
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      logger.warn(`[CMD] Unknown command: ${interaction.commandName}`);
      return;
    }

    logger.info(`[CMD] /${interaction.commandName} used by ${interaction.user.tag} in ${interaction.guild?.name ?? 'DM'}`);

    try {
      await command.execute(interaction);
    } catch (err) {
      logger.error(`[CMD] Error executing /${interaction.commandName}:`, err);

      const payload = {
        embeds: [errorEmbed('Command Error', 'An unexpected error occurred. Please try again or contact an admin.')],
        ephemeral: true,
      };

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload);
        } else {
          await interaction.reply(payload);
        }
      } catch (_) {
        // Interaction already expired — silently ignore
      }
    }
  },
};
