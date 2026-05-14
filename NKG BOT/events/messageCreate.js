const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config/config');
const logger = require('../utils/logger');
const rrManager = require('../utils/reactionRoleManager');
const brManager = require('../utils/buttonRoleManager');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        // Ignore bots and DM messages
        if (message.author.bot || !message.guild) return;

        // Moderation Logic (Link & Keyword Protection)
        if (config.moderation && config.moderation.linkProtection) {
            
            // Bypass if user is Administrator or has a bypass role
            const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);
            const hasBypassRole = message.member.roles.cache.some(role => 
                config.moderation.bypassRoles.includes(role.id)
            );

            if (!isAdmin && !hasBypassRole) {
                const content = message.content.toLowerCase();
                
                // 1. Check for Blacklisted Keywords (Self-Promotion)
                const hasBlacklistedWord = config.moderation.blacklistedKeywords?.some(word => 
                    content.includes(word.toLowerCase())
                );

                // 2. Check for URLs and Discord Invites
                const urlRegex = /((https?:\/\/|www\.)[^\s]+|discord\.gg\/[^\s]+|discord\.com\/invite\/[^\s]+)/gi;
                const urlMatches = message.content.match(urlRegex);
                
                let shouldPunish = false;
                let reason = '';

                if (hasBlacklistedWord) {
                    shouldPunish = true;
                    reason = 'Self-promotion keywords detected';
                } else if (urlMatches) {
                    for (const url of urlMatches) {
                        try {
                            // Normalize URL for domain extraction
                            let normalizedUrl = url;
                            if (!url.startsWith('http')) {
                                normalizedUrl = 'https://' + url.replace(/^www\./i, '');
                            }
                            
                            const domain = new URL(normalizedUrl).hostname.replace('www.', '');
                            
                            // Check if it's a Discord invite link (unless trusted)
                            const isDiscordInvite = domain === 'discord.gg' || (domain === 'discord.com' && url.includes('/invite/'));
                            
                            const isTrusted = config.moderation.trustedDomains.some(trusted => 
                                domain === trusted || domain.endsWith('.' + trusted)
                            );

                            if (isDiscordInvite || !isTrusted) {
                                shouldPunish = true;
                                reason = isDiscordInvite ? 'Unauthorized Discord Invite' : `Unauthorized link: ${domain}`;
                                break;
                            }
                        } catch (e) {}
                    }
                }

                if (shouldPunish) {
                    // Delete IMMEDIATELY
                    await message.delete().catch(() => {});

                    // Timeout (minutes from config converted to ms)
                    const minutes = config.moderation.timeoutMinutes || 60;
                    const duration = minutes * 60000;
                    await message.member.timeout(duration, `Self-Promotion / Spam Protection: ${reason}`)
                        .catch(err => logger.error(`[MODERATION] Failed to timeout: ${err.message}`));

                    // Calculate readable time for embed
                    const hours = Math.floor(minutes / 60);
                    const remainingMinutes = minutes % 60;
                    
                    let timeString = '';
                    if (hours > 0) {
                        timeString = `${hours} hour(s)${remainingMinutes > 0 ? ` and ${remainingMinutes} minute(s)` : ''}`;
                    } else {
                        timeString = `${minutes} minute(s)`;
                    }

                    // Send Warning
                    const warningEmbed = new EmbedBuilder()
                        .setColor(config.colors.error)
                        .setAuthor({ name: 'NKG Security', iconURL: config.branding.logo })
                        .setTitle('Self-Promotion Blocked')
                        .setDescription(`🚫 **${message.author.username}**, self-promotion and unauthorized links are strictly prohibited.\n\nYou have been timed out for **${timeString}**.`)
                        .setFooter({ text: 'NKG Anti-Spam System' });

                    const warningMsg = await message.channel.send({ embeds: [warningEmbed] });
                    setTimeout(() => warningMsg.delete().catch(() => {}), 10000);
                    
                    logger.info(`[MODERATION] Punished ${message.author.tag} for: ${reason} (${timeString} timeout)`);
                    return;
                }
            }
        }

        // --- COMMAND HANDLER ---
        const prefix = config.prefix || '!';
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        // 1. CLEAR COMMAND
        if (command === 'clear' || command === 'purge') {
            // Check permissions
            if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                return message.reply('❌ You do not have permission to use this command.').then(msg => {
                    setTimeout(() => msg.delete().catch(() => {}), 5000);
                });
            }

            const amount = parseInt(args[0]);

            if (isNaN(amount) || amount < 1 || amount > 100) {
                return message.reply('❌ Please provide a number between 1 and 100.').then(msg => {
                    setTimeout(() => msg.delete().catch(() => {}), 5000);
                });
            }

            try {
                // Delete the command message first
                await message.delete().catch(() => {});

                // Bulk delete
                const deleted = await message.channel.bulkDelete(amount, true);

                const successEmbed = new EmbedBuilder()
                    .setColor(config.colors.success)
                    .setDescription(`✅ Successfully deleted **${deleted.size}** messages.`)
                    .setFooter({ text: 'This message will be deleted in 5 seconds.' });

                const reply = await message.channel.send({ embeds: [successEmbed] });
                setTimeout(() => reply.delete().catch(() => {}), 5000);
                
                logger.info(`[COMMAND] ${message.author.tag} cleared ${deleted.size} messages in #${message.channel.name}`);
            } catch (err) {
                logger.error(`[ERROR] Clear command failed: ${err.message}`);
                message.reply('❌ An error occurred while trying to clear messages.').then(msg => {
                    setTimeout(() => msg.delete().catch(() => {}), 5000);
                });
            }
        }

        // 2. SETUP ROLES COMMAND (!setuproles)
        if (command === 'setuproles') {
            // Admin only
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return message.reply('❌ Only Administrators can use this command.').then(msg => {
                    setTimeout(() => msg.delete().catch(() => {}), 5000);
                });
            }

            // Build full list G-1 to G-94
            const allRoles = Array.from({ length: 94 }, (_, i) => `G-${i + 1}`);

            // Fetch FRESH roles from Discord (not cache) to avoid duplicates
            await message.guild.roles.fetch();
            const existingRoleNames = message.guild.roles.cache.map(r => r.name.toLowerCase());
            const toCreate = allRoles.filter(r => !existingRoleNames.includes(r.toLowerCase()));
            const skipped = allRoles.length - toCreate.length;

            if (toCreate.length === 0) {
                const doneEmbed = new EmbedBuilder()
                    .setColor(config.colors.success)
                    .setTitle('✅ All Roles Already Exist')
                    .setDescription('All **G-1** to **G-94** roles are already created! Nothing to do.')
                    .setFooter({ text: config.branding.footer });
                return message.channel.send({ embeds: [doneEmbed] });
            }

            // Send progress message
            const progressEmbed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle('⚙️ Creating Roles...')
                .setDescription(`Found **${skipped}** existing roles. Creating **${toCreate.length}** missing roles...\n\n⏳ Please wait, this may take a moment.`)
                .setFooter({ text: config.branding.footer });

            const progressMsg = await message.channel.send({ embeds: [progressEmbed] });

            let created = 0;
            let failed = 0;

            for (const roleName of toCreate) {
                try {
                    await message.guild.roles.create({
                        name: roleName,
                        color: 'Default',  // Normal grey role
                        hoist: false,       // Not shown separately
                        mentionable: false,
                        reason: `NKG Bot bulk role setup by ${message.author.tag}`
                    });
                    created++;

                    // Update progress every 10 roles
                    if (created % 10 === 0) {
                        const updateEmbed = new EmbedBuilder()
                            .setColor(config.colors.primary)
                            .setTitle('⚙️ Creating Roles...')
                            .setDescription(`Found **${skipped}** existing roles. Creating **${toCreate.length}** missing roles...\n\n✅ Created **${created}** / **${toCreate.length}** so far...`)
                            .setFooter({ text: config.branding.footer });
                        await progressMsg.edit({ embeds: [updateEmbed] }).catch(() => {});
                    }

                    // Small delay to respect Discord rate limits
                    await new Promise(resolve => setTimeout(resolve, 300));
                } catch (err) {
                    failed++;
                    logger.error(`[SETUPROLES] Failed to create role ${roleName}: ${err.message}`);
                }
            }

            // Final result embed
            const resultEmbed = new EmbedBuilder()
                .setColor(failed === 0 ? config.colors.success : config.colors.warning)
                .setTitle('🎉 Role Setup Complete!')
                .addFields(
                    { name: '✅ Created', value: `**${created}** roles`, inline: true },
                    { name: '⏭️ Skipped (existed)', value: `**${skipped}** roles`, inline: true },
                    { name: '❌ Failed', value: `**${failed}** roles`, inline: true },
                    { name: '📋 Range', value: 'G-1 to G-94', inline: false }
                )
                .setFooter({ text: config.branding.footer })
                .setTimestamp();

            await progressMsg.edit({ embeds: [resultEmbed] });
            logger.info(`[SETUPROLES] ${message.author.tag} created ${created} roles, skipped ${skipped}, failed ${failed}`);
        }

        // 3. CLEAN ROLES COMMAND (!cleanroles) — Deletes duplicate G-XX roles
        if (command === 'cleanroles') {
            // Admin only
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return message.reply('❌ Only Administrators can use this command.').then(msg => {
                    setTimeout(() => msg.delete().catch(() => {}), 5000);
                });
            }

            // Fetch fresh roles
            await message.guild.roles.fetch();

            // Group all G-XX roles by name (case-insensitive)
            const gRolePattern = /^G-\d+$/i;
            const roleGroups = {};

            message.guild.roles.cache.forEach(role => {
                if (gRolePattern.test(role.name)) {
                    const key = role.name.toUpperCase();
                    if (!roleGroups[key]) roleGroups[key] = [];
                    roleGroups[key].push(role);
                }
            });

            // Find duplicates (keep the first/oldest, delete the rest)
            const toDelete = [];
            for (const [, roles] of Object.entries(roleGroups)) {
                if (roles.length > 1) {
                    // Sort by createdTimestamp ascending, keep first, delete rest
                    roles.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
                    toDelete.push(...roles.slice(1));
                }
            }

            if (toDelete.length === 0) {
                const cleanEmbed = new EmbedBuilder()
                    .setColor(config.colors.success)
                    .setTitle('✅ No Duplicates Found')
                    .setDescription('All G-XX roles are clean — no duplicates detected!')
                    .setFooter({ text: config.branding.footer });
                return message.channel.send({ embeds: [cleanEmbed] });
            }

            // Send progress
            const cleanProgress = new EmbedBuilder()
                .setColor(config.colors.warning)
                .setTitle('🧹 Cleaning Duplicate Roles...')
                .setDescription(`Found **${toDelete.length}** duplicate roles. Deleting them now...\n\n⏳ Please wait...`)
                .setFooter({ text: config.branding.footer });

            const cleanMsg = await message.channel.send({ embeds: [cleanProgress] });

            let deleted = 0;
            let cleanFailed = 0;

            for (const role of toDelete) {
                try {
                    await role.delete(`Duplicate cleanup by ${message.author.tag}`);
                    deleted++;
                    await new Promise(resolve => setTimeout(resolve, 300));
                } catch (err) {
                    cleanFailed++;
                    logger.error(`[CLEANROLES] Failed to delete ${role.name}: ${err.message}`);
                }
            }

            const cleanResult = new EmbedBuilder()
                .setColor(cleanFailed === 0 ? config.colors.success : config.colors.warning)
                .setTitle('🎉 Cleanup Complete!')
                .addFields(
                    { name: '🗑️ Deleted', value: `**${deleted}** duplicate roles`, inline: true },
                    { name: '❌ Failed', value: `**${cleanFailed}** roles`, inline: true }
                )
                .setDescription('All duplicate G-XX roles have been removed. Each role now exists only once.')
                .setFooter({ text: config.branding.footer })
                .setTimestamp();

            await cleanMsg.edit({ embeds: [cleanResult] });
            logger.info(`[CLEANROLES] ${message.author.tag} deleted ${deleted} duplicate roles, failed ${cleanFailed}`);
        }

        // 4. REACTION ROLES COMMAND (!rr)
        if (command === 'rr') {
            // Admin only
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return message.reply('❌ Only Administrators can use this command.').then(msg => {
                    setTimeout(() => msg.delete().catch(() => {}), 5000);
                });
            }

            const sub = args[0]?.toLowerCase();

            // ─── !rr help ───────────────────────────────────────────────
            if (!sub || sub === 'help') {
                const helpEmbed = new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setTitle('🏷️ Reaction Roles — Help')
                    .setDescription('Create panels where users react to get roles automatically.')
                    .addFields(
                        { name: '`!rr create <#channel> <Title> | <Description>`', value: 'Create a new reaction role panel in a channel.', inline: false },
                        { name: '`!rr add <messageId> <emoji> <@role>`', value: 'Add an emoji → role mapping to a panel.', inline: false },
                        { name: '`!rr remove <messageId> <emoji>`', value: 'Remove an emoji mapping from a panel.', inline: false },
                        { name: '`!rr list`', value: 'List all active reaction role panels.', inline: false },
                        { name: '`!rr delete <messageId>`', value: 'Delete an entire reaction role panel.', inline: false },
                    )
                    .setFooter({ text: config.branding.footer });
                return message.channel.send({ embeds: [helpEmbed] });
            }

            // ─── !rr create <#channel> <Title> | <Description> ──────────
            if (sub === 'create') {
                const channel = message.mentions.channels.first();
                if (!channel) {
                    return message.reply('❌ Usage: `!rr create <#channel> <Title> | <Description>`');
                }

                // Everything after the channel mention
                const rest = args.slice(2).join(' ');
                const parts = rest.split('|');
                const title = parts[0]?.trim() || '🏷️ Role Selection';
                const description = parts[1]?.trim() || 'React below to get your role!';

                const panelEmbed = new EmbedBuilder()
                    .setColor(config.colors.secondary)
                    .setTitle(title)
                    .setDescription(description + '\n\n*React to this message to assign yourself a role.*')
                    .setFooter({ text: '🔄 React to get/remove roles • ' + config.branding.name })
                    .setTimestamp();

                const panelMsg = await channel.send({ embeds: [panelEmbed] });

                const confirmEmbed = new EmbedBuilder()
                    .setColor(config.colors.success)
                    .setTitle('✅ Panel Created!')
                    .setDescription(`Reaction role panel created in ${channel}.\n\n**Message ID:** \`${panelMsg.id}\`\n\nNow add roles with:\n\`!rr add ${panelMsg.id} ❤️ @RoleName\``)
                    .setFooter({ text: config.branding.footer });
                return message.channel.send({ embeds: [confirmEmbed] });
            }

            // ─── !rr add <messageId> <emoji> <@role> ────────────────────
            if (sub === 'add') {
                const messageId = args[1];
                const emojiRaw = args[2];
                const role = message.mentions.roles.first();

                if (!messageId || !emojiRaw || !role) {
                    return message.reply('❌ Usage: `!rr add <messageId> <emoji> <@role>`');
                }

                // Normalize emoji: custom emoji = <:name:id> or <a:name:id>
                let emojiKey = emojiRaw;
                const customMatch = emojiRaw.match(/^<a?:([\w]+):(\d+)>$/);
                if (customMatch) {
                    emojiKey = `${customMatch[1]}:${customMatch[2]}`;
                }

                // Try to fetch the panel message and add the reaction
                try {
                    // Find panel message across all channels
                    let panelMsg = null;
                    for (const ch of message.guild.channels.cache.values()) {
                        if (ch.isTextBased()) {
                            try {
                                panelMsg = await ch.messages.fetch(messageId);
                                if (panelMsg) break;
                            } catch {}
                        }
                    }

                    if (!panelMsg) {
                        return message.reply('❌ Could not find a message with that ID. Make sure the bot can see the channel.');
                    }

                    // Add emoji to the panel message as a reaction
                    await panelMsg.react(emojiRaw).catch(() => {});

                    // Save the mapping
                    rrManager.addMapping(messageId, emojiKey, role.id);

                    const addEmbed = new EmbedBuilder()
                        .setColor(config.colors.success)
                        .setTitle('✅ Mapping Added!')
                        .addFields(
                            { name: 'Emoji', value: emojiRaw, inline: true },
                            { name: 'Role', value: `${role}`, inline: true },
                            { name: 'Panel ID', value: `\`${messageId}\``, inline: true }
                        )
                        .setDescription('Users who react with this emoji will receive the role automatically.')
                        .setFooter({ text: config.branding.footer });
                    return message.channel.send({ embeds: [addEmbed] });

                } catch (err) {
                    logger.error(`[RR ADD] ${err.message}`);
                    return message.reply('❌ Failed to add mapping. Check the message ID and bot permissions.');
                }
            }

            // ─── !rr remove <messageId> <emoji> ─────────────────────────
            if (sub === 'remove') {
                const messageId = args[1];
                const emojiRaw = args[2];

                if (!messageId || !emojiRaw) {
                    return message.reply('❌ Usage: `!rr remove <messageId> <emoji>`');
                }

                let emojiKey = emojiRaw;
                const customMatch = emojiRaw.match(/^<a?:([\w]+):(\d+)>$/);
                if (customMatch) {
                    emojiKey = `${customMatch[1]}:${customMatch[2]}`;
                }

                rrManager.removeMapping(messageId, emojiKey);

                const removeEmbed = new EmbedBuilder()
                    .setColor(config.colors.warning)
                    .setTitle('🗑️ Mapping Removed')
                    .setDescription(`Emoji **${emojiRaw}** mapping removed from panel \`${messageId}\`.`)
                    .setFooter({ text: config.branding.footer });
                return message.channel.send({ embeds: [removeEmbed] });
            }

            // ─── !rr list ────────────────────────────────────────────────
            if (sub === 'list') {
                const allPanels = rrManager.getAll();
                const entries = Object.entries(allPanels);

                if (entries.length === 0) {
                    const emptyEmbed = new EmbedBuilder()
                        .setColor(config.colors.warning)
                        .setTitle('📋 No Panels')
                        .setDescription('No reaction role panels set up yet. Use `!rr create` to get started.')
                        .setFooter({ text: config.branding.footer });
                    return message.channel.send({ embeds: [emptyEmbed] });
                }

                const listEmbed = new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setTitle('📋 Active Reaction Role Panels')
                    .setFooter({ text: `${entries.length} panel(s) active • ${config.branding.name}` });

                for (const [msgId, mappings] of entries) {
                    const lines = Object.entries(mappings).map(([emoji, roleId]) => {
                        // Format emoji display
                        const emojiDisplay = emoji.includes(':') ? `<:${emoji}>` : emoji;
                        return `${emojiDisplay} → <@&${roleId}>`;
                    });
                    listEmbed.addFields({
                        name: `Panel ID: \`${msgId}\``,
                        value: lines.join('\n') || 'No mappings',
                        inline: false
                    });
                }

                return message.channel.send({ embeds: [listEmbed] });
            }

            // ─── !rr delete <messageId> ──────────────────────────────────
            if (sub === 'delete') {
                const messageId = args[1];
                if (!messageId) {
                    return message.reply('❌ Usage: `!rr delete <messageId>`');
                }

                rrManager.removePanel(messageId);

                const delEmbed = new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle('🗑️ Panel Deleted')
                    .setDescription(`All reaction role mappings for panel \`${messageId}\` have been removed.\n\n*The Discord message itself was NOT deleted.*`)
                    .setFooter({ text: config.branding.footer });
                return message.channel.send({ embeds: [delEmbed] });
            }
        }

        // 5. BUTTON ROLES COMMAND (!br)
        if (command === 'br') {
            // Admin only
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return message.reply('❌ Only Administrators can use this command.').then(msg => {
                    setTimeout(() => msg.delete().catch(() => {}), 5000);
                });
            }

            const sub = args[0]?.toLowerCase();

            // Helper: rebuild button rows from stored data
            function buildRows(buttons) {
                const rows = [];
                for (let i = 0; i < buttons.length; i += 5) {
                    const chunk = buttons.slice(i, i + 5);
                    const row = new ActionRowBuilder().addComponents(
                        chunk.map(btn =>
                            new ButtonBuilder()
                                .setCustomId(`buttonrole_${btn.roleId}`)
                                .setLabel(btn.label)
                                .setStyle(ButtonStyle[btn.style] ?? ButtonStyle.Secondary)
                        )
                    );
                    rows.push(row);
                }
                return rows;
            }

            // ─── !br help ────────────────────────────────────────
            if (!sub || sub === 'help') {
                const helpEmbed = new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setTitle('🔘 Button Roles — Help')
                    .setDescription('Create panels with clickable buttons that assign/remove roles. Clicking again **toggles** the role off.')
                    .addFields(
                        { name: '`!br create <#channel> <Title> | <Description>`', value: 'Create a new button role panel.', inline: false },
                        { name: '`!br setup <messageId> <start> <end> [color]`', value: 'Bulk-add G-roles (e.g., `!br setup ID 1 25 Primary`).', inline: false },
                        { name: '`!br add <messageId> <@role> <Label> [Primary|Secondary|Success|Danger]`', value: 'Add a single button.', inline: false },
                        { name: '`!br remove <messageId> <@role>`', value: 'Remove a button.', inline: false },
                        { name: '`!br list`', value: 'List all active button role panels.', inline: false },
                        { name: '`!br delete <messageId>`', value: 'Delete an entire button role panel.', inline: false },
                    )
                    .setFooter({ text: config.branding.footer });
                return message.channel.send({ embeds: [helpEmbed] });
            }

            // ─── !br create <#channel> <Title> | <Description> ──────────
            if (sub === 'create') {
                const channel = message.mentions.channels.first();
                if (!channel) {
                    return message.reply('❌ Usage: `!br create <#channel> <Title> | <Description>`');
                }

                const rest = args.slice(2).join(' ');
                const parts = rest.split('|');
                const title = parts[0]?.trim() || '🔘 Role Selection';
                const description = parts[1]?.trim() || 'Click a button below to get your role!';

                const panelEmbed = new EmbedBuilder()
                    .setColor(config.colors.secondary)
                    .setTitle(title)
                    .setDescription(description + '\n\n*Click a button to get or remove a role. Click again to toggle off.*')
                    .setFooter({ text: '🔄 Click to get/remove roles • ' + config.branding.name })
                    .setTimestamp();

                // Send with a placeholder disabled button until roles are added
                const placeholder = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('buttonrole_placeholder')
                        .setLabel('No roles yet — admin use !br add')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                );

                const panelMsg = await channel.send({ embeds: [panelEmbed], components: [placeholder] });

                // Save panel with empty buttons
                brManager.setPanel(panelMsg.id, channel.id, []);

                const confirmEmbed = new EmbedBuilder()
                    .setColor(config.colors.success)
                    .setTitle('✅ Button Panel Created!')
                    .setDescription(`Panel created in ${channel}.\n\n**Message ID:** \`${panelMsg.id}\`\n\nNow add buttons with:\n\`!br add ${panelMsg.id} @G-1 G-1 Primary\``)
                    .addFields({ name: 'Button Colors', value: '`Primary` (Blue) | `Secondary` (Grey) | `Success` (Green) | `Danger` (Red)' })
                    .setFooter({ text: config.branding.footer });
                return message.channel.send({ embeds: [confirmEmbed] });
            }

            // ─── !br add <messageId> <@role> <Label> [style] ─────────────
            if (sub === 'add') {
                const messageId = args[1];
                const role = message.mentions.roles.first();
                // args: ['add', 'msgId', '@role', ...label words, optional_style]
                const validStyles = ['Primary', 'Secondary', 'Success', 'Danger'];
                const lastArg = args[args.length - 1];
                let style = 'Primary';
                let labelArgs = args.slice(3);
                if (validStyles.map(s => s.toLowerCase()).includes(lastArg?.toLowerCase())) {
                    style = validStyles.find(s => s.toLowerCase() === lastArg.toLowerCase());
                    labelArgs = args.slice(3, args.length - 1);
                }
                const label = labelArgs.join(' ').trim() || role?.name || 'Role';

                if (!messageId || !role) {
                    return message.reply('❌ Usage: `!br add <messageId> <@role> <Label> [Primary|Secondary|Success|Danger]`');
                }

                if (label.length > 80) {
                    return message.reply('❌ Button label must be 80 characters or less.');
                }

                try {
                    // Fetch the panel message
                    const panel = brManager.getPanel(messageId);

                    // Panel must be created first with !br create
                    if (!panel) {
                        return message.reply(
                            '❌ No panel found with that ID.\n\n' +
                            '**Step 1:** First create a panel:\n`!br create #channel-name Title | Description`\n\n' +
                            '**Step 2:** Then add buttons using the Message ID the bot gives you:\n`!br add <messageId> @G-1 GROUP 1 Primary`'
                        );
                    }

                    const channelId = panel?.channelId;
                    const panelChannel = channelId
                        ? message.guild.channels.cache.get(channelId)
                        : message.guild.channels.cache.find(c => c.isTextBased() && c.messages?.cache?.has(messageId));

                    if (!panelChannel) return message.reply('❌ Could not find the panel channel. Make sure the bot has access to it.');

                    const panelMsg = await panelChannel.messages.fetch(messageId).catch(() => null);
                    if (!panelMsg) return message.reply('❌ Could not find the panel message. Check the message ID.');

                    // Check button limit (max 25)
                    const currentButtons = panel?.buttons || [];
                    if (currentButtons.length >= 25) {
                        return message.reply('❌ Maximum 25 buttons per panel reached. Create a new panel.');
                    }

                    // Save to store
                    brManager.addButton(messageId, panelChannel.id, role.id, label, style);

                    // Rebuild and update the panel message
                    const updatedPanel = brManager.getPanel(messageId);
                    const rows = buildRows(updatedPanel.buttons);
                    await panelMsg.edit({ components: rows });

                    const addEmbed = new EmbedBuilder()
                        .setColor(config.colors.success)
                        .setTitle('✅ Button Added!')
                        .addFields(
                            { name: 'Label', value: label, inline: true },
                            { name: 'Role', value: `${role}`, inline: true },
                            { name: 'Color', value: style, inline: true },
                            { name: 'Panel', value: `\`${messageId}\``, inline: false }
                        )
                        .setDescription('Users can now click this button to get or remove the role.')
                        .setFooter({ text: config.branding.footer });
                    return message.channel.send({ embeds: [addEmbed] });

                } catch (err) {
                    logger.error(`[BR ADD] ${err.message}`);
                    return message.reply('❌ Failed to add button. Check permissions and message ID.');
                }
            }

            // ─── !br setup <messageId> <start> <end> [style] ─────────────
            if (sub === 'setup') {
                const messageId = args[1];
                const start = parseInt(args[2]);
                const end = parseInt(args[3]);
                const style = args[4] || 'Primary';

                if (!messageId || isNaN(start) || isNaN(end)) {
                    return message.reply('❌ Usage: `!br setup <messageId> <startNumber> <endNumber> [color]`\nExample: `!br setup ID 1 25 Primary`');
                }

                try {
                    const panel = brManager.getPanel(messageId);
                    if (!panel) return message.reply('❌ Panel not found. Create one with `!br create` first.');

                    const panelChannel = message.guild.channels.cache.get(panel.channelId);
                    const panelMsg = await panelChannel?.messages.fetch(messageId).catch(() => null);
                    if (!panelMsg) return message.reply('❌ Panel message not found.');

                    const progressMsg = await message.reply(`⚙️ Adding G-${start} to G-${end}...`);
                    
                    let addedCount = 0;
                    for (let i = start; i <= end; i++) {
                        const roleName = `G-${i}`;
                        const role = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
                        
                        if (role) {
                            brManager.addButton(messageId, panel.channelId, role.id, `GROUP ${i}`, style);
                            addedCount++;
                        }
                        
                        // Respect rate limits
                        if (i % 5 === 0) await new Promise(r => setTimeout(r, 500));
                    }

                    // Update the panel message
                    const updatedPanel = brManager.getPanel(messageId);
                    const rows = buildRows(updatedPanel.buttons);
                    await panelMsg.edit({ components: rows });

                    return progressMsg.edit(`✅ Successfully added **${addedCount}** G-roles to the panel!`);

                } catch (err) {
                    logger.error(`[BR SETUP] ${err.message}`);
                    return message.reply('❌ Error during bulk setup. Check bot permissions.');
                }
            }

            // ─── !br remove <messageId> <@role> ──────────────────────
            if (sub === 'remove') {
                const messageId = args[1];
                const role = message.mentions.roles.first();

                if (!messageId || !role) {
                    return message.reply('❌ Usage: `!br remove <messageId> <@role>`');
                }

                try {
                    const panel = brManager.getPanel(messageId);
                    if (!panel) return message.reply('❌ No panel found with that ID.');

                    const panelChannel = message.guild.channels.cache.get(panel.channelId);
                    const panelMsg = await panelChannel?.messages.fetch(messageId).catch(() => null);

                    brManager.removeButton(messageId, role.id);

                    // Rebuild panel buttons
                    const updatedPanel = brManager.getPanel(messageId);
                    if (updatedPanel && updatedPanel.buttons.length > 0) {
                        const rows = buildRows(updatedPanel.buttons);
                        await panelMsg?.edit({ components: rows });
                    } else {
                        // No buttons left — show disabled placeholder
                        const placeholder = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('buttonrole_placeholder')
                                .setLabel('No roles configured')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true)
                        );
                        await panelMsg?.edit({ components: [placeholder] });
                    }

                    const removeEmbed = new EmbedBuilder()
                        .setColor(config.colors.warning)
                        .setTitle('🗑️ Button Removed')
                        .setDescription(`Button for ${role} removed from panel \`${messageId}\`.`)
                        .setFooter({ text: config.branding.footer });
                    return message.channel.send({ embeds: [removeEmbed] });

                } catch (err) {
                    logger.error(`[BR REMOVE] ${err.message}`);
                    return message.reply('❌ Failed to remove button.');
                }
            }

            // ─── !br list ─────────────────────────────────────────
            if (sub === 'list') {
                const allPanels = brManager.getAll();
                const entries = Object.entries(allPanels);

                if (entries.length === 0) {
                    return message.channel.send({ embeds: [new EmbedBuilder()
                        .setColor(config.colors.warning)
                        .setTitle('📌 No Button Panels')
                        .setDescription('No button role panels set up yet. Use `!br create` to get started.')
                        .setFooter({ text: config.branding.footer })] });
                }

                const listEmbed = new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setTitle('📌 Active Button Role Panels')
                    .setFooter({ text: `${entries.length} panel(s) • ${config.branding.name}` });

                for (const [msgId, panel] of entries) {
                    const lines = panel.buttons.map(btn =>
                        `\`${btn.label}\` [${btn.style}] → <@&${btn.roleId}>`
                    );
                    listEmbed.addFields({
                        name: `Panel \`${msgId}\` — <#${panel.channelId}>`,
                        value: lines.join('\n') || 'No buttons',
                        inline: false
                    });
                }
                return message.channel.send({ embeds: [listEmbed] });
            }

            // ─── !br delete <messageId> ───────────────────────────────
            if (sub === 'delete') {
                const messageId = args[1];
                if (!messageId) return message.reply('❌ Usage: `!br delete <messageId>`');

                try {
                    const panel = brManager.getPanel(messageId);
                    if (panel) {
                        const panelChannel = message.guild.channels.cache.get(panel.channelId);
                        const panelMsg = await panelChannel?.messages.fetch(messageId).catch(() => null);
                        // Disable all buttons on the message
                        if (panelMsg) {
                            const disabledRows = panel.buttons.map((_, i) => i).reduce((rows, _, idx) => {
                                // Rebuild rows but all disabled
                                return rows;
                            }, []);
                            await panelMsg.edit({ components: [] }).catch(() => {});
                        }
                    }

                    brManager.removePanel(messageId);

                    const delEmbed = new EmbedBuilder()
                        .setColor(config.colors.error)
                        .setTitle('🗑️ Panel Deleted')
                        .setDescription(`Button role panel \`${messageId}\` has been deactivated.\n\n*Buttons on the Discord message have been removed.*`)
                        .setFooter({ text: config.branding.footer });
                    return message.channel.send({ embeds: [delEmbed] });

                } catch (err) {
                    logger.error(`[BR DELETE] ${err.message}`);
                    return message.reply('❌ Failed to delete panel.');
                }
            }
        }
        // 6. SETUP CHANNELS COMMAND (!setupchannels)
        if (command === 'setupchannels') {
            // Admin only
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return message.reply('❌ Only Administrators can use this command.').then(msg => {
                    setTimeout(() => msg.delete().catch(() => {}), 5000);
                });
            }

            const roundName = args.join(' ') || 'ROUND 1';
            const progressMsg = await message.reply(`⚙️ Starting full setup for **${roundName}** (Categories + 94 Channels)... This will take a while.`);

            let createdCount = 0;
            let currentCategory = null;

            for (let i = 1; i <= 94; i++) {
                // Every 10 channels, create a NEW Category
                if ((i - 1) % 10 === 0) {
                    const start = i;
                    const end = Math.min(i + 9, 94);
                    try {
                        currentCategory = await message.guild.channels.create({
                            name: `${roundName.toUpperCase()} - ID PASS (${start} - ${end})`,
                            type: 4, // GuildCategory
                            reason: `Bulk setup by ${message.author.tag}`
                        });
                        logger.info(`[SETUPCHANNELS] Created Category: ${currentCategory.name}`);
                    } catch (err) {
                        logger.error(`[SETUPCHANNELS] Failed to create category: ${err.message}`);
                        return message.reply('❌ Failed to create category. Check bot permissions.');
                    }
                }

                const roleName = `G-${i}`;
                const chanName = `group-${i}`;
                
                // Find the matching role
                const role = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());

                if (!role) {
                    logger.error(`[SETUPCHANNELS] Role ${roleName} not found, skipping channel.`);
                    continue;
                }

                try {
                    // Create the private channel inside the current category
                    await message.guild.channels.create({
                        name: chanName,
                        type: 0, // GuildText
                        parent: currentCategory.id,
                        permissionOverwrites: [
                            {
                                id: message.guild.id, // @everyone
                                deny: [PermissionFlagsBits.ViewChannel],
                            },
                            {
                                id: role.id, // The G-role
                                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
                            },
                            {
                                id: client.user.id, // The Bot
                                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                            }
                        ],
                        reason: `Bulk setup by ${message.author.tag}`
                    });

                    createdCount++;
                    
                    // Update progress every 5 channels
                    if (createdCount % 5 === 0) {
                        await progressMsg.edit(`⚙️ Progress: **${createdCount}/94** channels created...`).catch(() => {});
                    }

                    // Respect Discord rate limits (Channels are slow)
                    await new Promise(r => setTimeout(r, 2000)); 

                } catch (err) {
                    logger.error(`[SETUPCHANNELS] Failed to create ${chanName}: ${err.message}`);
                }
            }

            return progressMsg.edit(`✅ **${roundName}** setup complete!\n📦 Created **${createdCount}** private channels across 10 categories.`);
        }
    },
};
