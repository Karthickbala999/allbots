require('dotenv').config();

module.exports = {
    token: process.env.TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,
    
    // Feature Channels
    voiceChannelId: process.env.VOICE_CHANNEL_ID,
    welcomeChannelId: process.env.WELCOME_CHANNEL_ID,
    logChannelId: process.env.LOG_CHANNEL_ID,
    ticketCategoryId: process.env.TICKET_CATEGORY_ID,
    
    // Roles
    autoRoleId: process.env.AUTO_ROLE_ID,
    
    // Moderation
    moderation: {
        linkProtection: true,
        trustedDomains: [
            'google.com', 'tenor.com', 'giphy.com', 'spotify.com' ],

        blacklistedKeywords: ['support my channel', 'subscribe to', 'check out my channel', 'follow my twitch', 'sub to my'],
        timeoutMinutes: 10, // Just enter the number of minutes here (e.g., 60 for 1 hour)

        bypassRoles: ['1501842174516658202', '1501842174516658199','1501842174516658197','1501842623101538425','1501845774986641509'] // IDs of roles that can post links
    },
    
    // Design
    colors: {
        primary: '#00D4FF', // Neon Blue
        secondary: '#9D00FF', // Purple
        success: '#00FF87',
        error: '#FF0055',
        warning: '#FFB800'
    },
    
    branding: {
        name: 'NKG BOT',
        logo: 'https://i.imgur.com/example.png', // Replace with real NKG logo
        footer: '🔥 NKG ESPORTS | POWERED BY ANTIGRAVITY'
    },
    
    status: '🔥 NKG ESPORTS | 🚀 MATCHMAKING THE ELITE'
};
