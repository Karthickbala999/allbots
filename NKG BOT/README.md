# NKG BOT - 24/7 Voice Presence

A Discord bot for NKG ESPORTS that stays connected to one voice channel.

## Features

- 24/7 voice channel presence while the PC/server is running.
- Auto reconnect when the bot is moved, kicked, or the VC connection drops.
- Auto restart with PM2 if the Node process crashes.
- Logs are saved in the `logs` folder.

## Setup

1. Install dependencies:

   ```bat
   npm.cmd install
   ```

2. Fill in `.env` with your bot token, guild ID, and voice channel ID.

3. Start in background mode:

   ```bat
   start.bat
   ```

   After PM2 starts the bot, you can close the terminal window. The bot will keep running.

## Background Commands

- Start/reload bot: `start.bat`
- Check status: `status-background.bat`
- View logs: `logs-background.bat`
- Stop bot: `stop-background.bat`
- Foreground debug mode: `start-foreground.bat`

## Important

Closing the terminal is OK after using `start.bat`.

Shutting down/restarting the PC will still stop the bot. Run `start.bat` again after boot, or deploy it to an always-on server for true 24/7 uptime.

See `ORACLE.md` and `HOSTING.md` for cloud/VPS deployment steps.
