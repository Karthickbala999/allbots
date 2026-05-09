# Discord Music Bot 🎵

A complete, advanced, and production-ready Discord Music Bot built with **Node.js**, **Discord.js v14**, and **Kazagumo** (Lavalink wrapper).

## Features
- 🚀 Slash Commands Only
- 🎶 Supports YouTube, Spotify, SoundCloud, Apple Music
- 🎛️ High Quality Audio Streaming
- 📜 Advanced Queue System (Pagination, Shuffle, Loop)
- 🔁 Auto Reconnect & 24/7 Mode
- 🎧 Music Filters (Bassboost, Nightcore, Vaporwave, 8D, Karaoke, Tremolo, Vibrato)
- 🔘 Interactive Music Control Buttons
- 📊 Dynamic Progress Bar
- 📄 Lyrics Support
- 📻 Autoplay functionality
- 🛡️ Anti-crash system & Error Handling
- 🎨 Modern Dark Embed Style UI

## Prerequisites
- **Node.js** v16.9.0 or higher
- **Discord Bot Token**
- **Lavalink Server** v4.x or higher
- **MongoDB** (For 24/7 data persistence)
- **Spotify API Credentials** (Client ID & Secret)

---

## 🛠️ Setup Guide

### 1. Clone & Install
Clone the repository and install all dependencies.
```bash
npm install
```

### 2. Configure Environment Variables
Rename the provided `.env.example` file to `.env` and fill out your credentials:
```env
TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
MONGO_URI=your_mongodb_connection_string_here
LAVALINK_HOST=localhost
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass
LAVALINK_SECURE=false
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
EMBED_COLOR=2B2D31
```

### 3. Start Lavalink
You need a Lavalink server running to process audio.
1. Download `Lavalink.jar` (v4.x) from the [official Lavalink repository](https://github.com/lavalink-devs/Lavalink).
2. Create an `application.yml` file in the same directory as the jar.
3. Start Lavalink:
```bash
java -jar Lavalink.jar
```
*(Check Lavalink documentation for `application.yml` setup if needed).*

### 4. Run the Bot
Once Lavalink is running, start your bot:
```bash
npm start
```
For development mode (auto-restart):
```bash
npm run dev
```

---

## 🚀 Discord Deployment Guide
If you want to host this bot 24/7 on a cloud platform (e.g., VPS, Heroku, Railway):

### Using PM2 on a VPS (Recommended)
1. Install PM2 globally: `npm i -g pm2`
2. Start the bot: `pm2 start index.js --name MusicBot`
3. Save PM2 state: `pm2 save`

### Using Docker (Optional)
You can create a `Dockerfile` and a `docker-compose.yml` to run both the bot and Lavalink together seamlessly.

---

## 📂 Project Structure
- `commands/` - All slash commands categorized by folders (music, admin)
- `events/` - Discord event handlers (ready, interactionCreate)
- `handlers/` - Command, event, and error loaders
- `utils/` - Utility scripts (custom logger)
- `config/` - Configuration exports mapping to `.env`
- `player/` - Kazagumo and Shoukaku Lavalink initialization
- `database/` - MongoDB schemas

Enjoy high-quality music in your Discord server! 🎉
