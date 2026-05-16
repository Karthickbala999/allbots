const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('live-clock')
        .setDescription('⏰ Create a live, ticking countdown clock in the chat')
        .addStringOption(option => 
            option.setName('title')
                .setDescription('What are we counting down to? (e.g. "ROUND 1 MATCH")')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('days')
                .setDescription('How many days until the match?')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('hours')
                .setDescription('Optional: Extra hours?')
                .setRequired(false))
        .addIntegerOption(option => 
            option.setName('minutes')
                .setDescription('Optional: Extra minutes?')
                .setRequired(false))
        .addIntegerOption(option => 
            option.setName('start')
                .setDescription('Optional: Starting group number (e.g., 1)')
                .setRequired(false))
        .addIntegerOption(option => 
            option.setName('end')
                .setDescription('Optional: Ending group number (e.g., 10)')
                .setRequired(false))
        .addRoleOption(option => 
            option.setName('mention_role')
                .setDescription('Optional: First role to mention')
                .setRequired(false))
        .addRoleOption(option => 
            option.setName('mention_role_2')
                .setDescription('Optional: Second role to mention')
                .setRequired(false))
        .addRoleOption(option => 
            option.setName('mention_role_3')
                .setDescription('Optional: Third role to mention')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('auto_ping_group')
                .setDescription('Automatically ping the matching group role (e.g. @G-1 in #group-1)?')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const title = interaction.options.getString('title');
        const days = interaction.options.getInteger('days');
        const hours = interaction.options.getInteger('hours') || 0;
        const minutes = interaction.options.getInteger('minutes') || 0;
        const startGroup = interaction.options.getInteger('start');
        const endGroup = interaction.options.getInteger('end');
        const mentionRole1 = interaction.options.getRole('mention_role');
        const mentionRole2 = interaction.options.getRole('mention_role_2');
        const mentionRole3 = interaction.options.getRole('mention_role_3');
        const autoPing = interaction.options.getBoolean('auto_ping_group');

        const totalMinutes = (days * 24 * 60) + (hours * 60) + minutes;

        if (totalMinutes < 1) {
            return interaction.reply({ content: '❌ Time must be at least 1 minute in the future.', flags: [MessageFlags.Ephemeral] });
        }

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const triggerAt = Date.now() + (totalMinutes * 60 * 1000);
        const unixTimestamp = Math.floor(triggerAt / 1000);

        const embed = new EmbedBuilder()
            .setTitle(`🔥 ${title} 🔥`)
            .setDescription(`**The match officially begins in:**\n# <t:${unixTimestamp}:R>\n\n📅 **Exact Date & Time:** <t:${unixTimestamp}:F>`)
            .setColor(config.colors.primary)
            .setFooter({ text: 'NKG ESPORTS LIVE CLOCK' });

        let basePings = [];
        const roles = [mentionRole1, mentionRole2, mentionRole3].filter(r => r != null);
        
        if (roles.length > 0) {
            for (const r of roles) {
                if (r.id === interaction.guild.id) {
                    basePings.push('@everyone');
                } else {
                    basePings.push(`<@&${r.id}>`);
                }
            }
        } else if (!autoPing) {
            // Default to @everyone only if they didn't specify roles AND didn't turn on autoPing
            basePings.push('@everyone');
        }

        const basePingText = basePings.join(' ');

        // If no start/end provided, send it in the current channel
        if (startGroup === null && endGroup === null) {
            let finalPing = basePingText;
            if (autoPing) {
                // Try to find the group number from the current channel
                const match = interaction.channel.name.match(/group-(\d+)/i);
                if (match) {
                    const groupNum = match[1];
                    const gRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === `g-${groupNum}` || r.name.toLowerCase() === `g${groupNum}`);
                    if (gRole) finalPing += ` <@&${gRole.id}>`;
                }
            }
            if (!finalPing.trim()) finalPing = '@everyone'; // Fallback
            
            await interaction.channel.send({ content: finalPing.trim(), embeds: [embed] });
            return interaction.editReply({ content: '✅ Clock posted in this channel!' });
        }

        // Broadcast to group channels
        await interaction.guild.channels.fetch();
        const groupChannels = interaction.guild.channels.cache.filter(c => {
            if (!c.isTextBased() || !c.name.toLowerCase().startsWith('group-')) return false;
            
            const match = c.name.match(/group-(\d+)/i);
            if (match) {
                const num = parseInt(match[1]);
                if (startGroup !== null && num < startGroup) return false;
                if (endGroup !== null && num > endGroup) return false;
                return true;
            }
            return false;
        });

        if (groupChannels.size === 0) {
            return interaction.editReply('❌ No group channels found within that range.');
        }

        let successCount = 0;
        let failCount = 0;

        for (const [id, channel] of groupChannels) {
            try {
                let channelPing = basePingText;
                
                if (autoPing) {
                    const match = channel.name.match(/group-(\d+)/i);
                    if (match) {
                        const groupNum = match[1];
                        const gRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === `g-${groupNum}` || r.name.toLowerCase() === `g${groupNum}`);
                        if (gRole) {
                            channelPing += ` <@&${gRole.id}>`;
                        }
                    }
                }
                
                if (!channelPing.trim()) channelPing = '@everyone'; // Fallback

                await channel.send({ content: channelPing.trim(), embeds: [embed] });
                successCount++;
            } catch (err) {
                failCount++;
            }
            await new Promise(resolve => setTimeout(resolve, 800)); // Rate limit prevention
        }

        await interaction.editReply({ content: `✅ **Clock Posted!**\nSuccessfully sent to ${successCount} groups.\n${failCount > 0 ? `⚠️ Failed on ${failCount} channels.` : ''}` });
    }
};
