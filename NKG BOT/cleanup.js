require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    
    if (!guild) {
        console.error("Guild not found!");
        process.exit(1);
    }

    let deleted = 0;
    const channels = await guild.channels.fetch();
    
    console.log("Searching for uncategorized 'group-' channels...");
    
    for (const [id, channel] of channels) {
        // If the channel has no parent (uncategorized) and its name contains "group-"
        if (!channel.parentId && channel.name && channel.name.toLowerCase().startsWith('group-')) {
            console.log(`Deleting uncategorized channel: ${channel.name} (ID: ${channel.id})`);
            try {
                await channel.delete();
                deleted++;
                // Small delay to avoid Discord rate limits
                await new Promise(r => setTimeout(r, 800));
            } catch (err) {
                console.error(`Failed to delete ${channel.name}: ${err.message}`);
            }
        }
    }
    
    console.log(`\n✅ Cleanup complete! Deleted ${deleted} uncategorized groups.`);
    process.exit(0);
});

client.login(process.env.TOKEN);
