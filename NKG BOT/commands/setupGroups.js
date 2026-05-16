const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-groups')
        .setDescription('🛠️ Bulk-create roles, categories, and private channels for your tournament')
        .addIntegerOption(option => 
            option.setName('start')
                .setDescription('Starting group number (e.g., 95)')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('end')
                .setDescription('Ending group number (e.g., 10)')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('role_prefix')
                .setDescription('What should the role start with? (e.g., "R2-" becomes R2-1)')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('channel_prefix')
                .setDescription('What should the channel start with? (e.g., "r2-group-" becomes r2-group-1)')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('category_name')
                .setDescription('Base name of the Category (e.g., "ROUND 1 - ID PASS")')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('channels_per_category')
                .setDescription('How many groups per category? (Default is 10)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const start = interaction.options.getInteger('start');
        const end = interaction.options.getInteger('end');
        const rolePrefix = interaction.options.getString('role_prefix');
        const channelPrefix = interaction.options.getString('channel_prefix');
        const baseCategoryName = interaction.options.getString('category_name');
        const perCategory = interaction.options.getInteger('channels_per_category') || 10;

        if (start > end) {
            return interaction.reply({ content: '❌ Start number must be smaller than End number.', ephemeral: true });
        }

        const totalToCreate = (end - start) + 1;
        if (totalToCreate > 50) {
            return interaction.reply({ content: '❌ For safety and Discord limits, please only create up to 50 groups at a time.', ephemeral: true });
        }

        await interaction.deferReply();
        await interaction.editReply(`⏳ **Building Groups ${start} to ${end}...** Please wait!`);

        let successCount = 0;

        for (let i = start; i <= end; i++) {
            try {
                // 1. CREATE ROLE
                const roleName = `${rolePrefix}${i}`;
                let role = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
                
                if (!role) {
                    role = await interaction.guild.roles.create({
                        name: roleName,
                        color: 'Default',
                        reason: `Automated Group Setup`
                    });
                }

                // 2. DETERMINE CATEGORY (e.g., ROUND 1 - ID PASS (11 - 20))
                const rangeIndex = Math.floor((i - 1) / perCategory);
                const rangeStart = (rangeIndex * perCategory) + 1;
                const rangeEnd = (rangeIndex + 1) * perCategory;
                const categoryName = `${baseCategoryName} (${rangeStart} - ${rangeEnd})`;

                let category = interaction.guild.channels.cache.find(c => 
                    c.type === ChannelType.GuildCategory && c.name.toUpperCase() === categoryName.toUpperCase()
                );

                if (!category) {
                    category = await interaction.guild.channels.create({
                        name: categoryName,
                        type: ChannelType.GuildCategory,
                        position: 99
                    });
                }

                // 3. CREATE CHANNEL
                const channelName = `${channelPrefix}${i}`;
                let channel = interaction.guild.channels.cache.find(c => 
                    c.type === ChannelType.GuildText && c.name.toLowerCase() === channelName.toLowerCase()
                );

                if (!channel) {
                    await interaction.guild.channels.create({
                        name: channelName,
                        type: ChannelType.GuildText,
                        parent: category.id,
                        permissionOverwrites: [
                            {
                                id: interaction.guild.id, // @everyone role
                                deny: [PermissionFlagsBits.ViewChannel], // Hide channel from public
                            },
                            {
                                id: role.id, // The G-Role we just created
                                allow: [
                                    PermissionFlagsBits.ViewChannel, 
                                    PermissionFlagsBits.SendMessages, 
                                    PermissionFlagsBits.ReadMessageHistory,
                                    PermissionFlagsBits.AttachFiles
                                ], // Let them chat
                            }
                        ]
                    });
                }
                
                successCount++;
                // Wait to avoid hitting Discord rate limits (Discord is strict on channel creation)
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                logger.error(`[SETUP] Failed on group ${i}: ${error.message}`);
            }
        }

        await interaction.editReply(`✅ **Setup Complete!**\nSuccessfully created/verified Roles and Channels for **${successCount}** groups.`);
    }
};
