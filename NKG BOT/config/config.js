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
    
    status: '🔥 NKG ESPORTS | TOURNAMENTS LIVE'
};
