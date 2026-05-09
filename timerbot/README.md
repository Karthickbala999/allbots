# ⏰ Discord Timer Management Bot

> A professional Discord.js v14 bot that automatically **locks and unlocks voice channels** based on tournament/event schedules.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔒 Auto Lock/Unlock | VC permissions flip automatically at scheduled times |
| 📅 Persistent Schedules | Survives bot restarts — stored in SQLite |
| 🌍 Timezone Support | Per-timer timezone via `moment-timezone` |
| 📢 Auto Announcements | Rich embeds when VC opens/closes |
| 🛡️ Admin Role Support | Configurable admin role for non-admin managers |
| 📊 Action Logs | Every lock/unlock is logged to a dedicated channel |
| 🔁 Every-Minute Check | `node-cron` job fires at :00 each minute |
| 🚫 Duplicate Guard | Prevents identical schedules |
| ⚡ Anti-Crash | Handles unhandled rejections gracefully |

---

## 📁 Project Structure

```
timerbot/
├── src/
│   ├── commands/
│   │   ├── setupvc.js        # Configure server defaults + timezone
│   │   ├── schedule.js       # Add a new timer
│   │   ├── listtimers.js     # List all active timers
│   │   ├── deletetimer.js    # Remove a timer by ID
│   │   ├── lockvc.js         # Manually lock a VC
│   │   └── unlockvc.js       # Manually unlock a VC
│   ├── events/
│   │   ├── ready.js          # Sets bot status, starts scheduler
│   │   └── interactionCreate.js  # Routes slash commands & autocomplete
│   ├── database/
│   │   └── db.js             # SQLite schema + CRUD helpers
│   ├── utils/
│   │   ├── scheduler.js      # node-cron timer engine
│   │   ├── embeds.js         # All Discord embed builders
│   │   ├── permissions.js    # Admin check + lockVC/unlockVC
│   │   ├── timezone.js       # moment-timezone validation & helpers
│   │   └── logger.js         # Colorized level-filtered logger
│   ├── deploy-commands.js    # Register slash commands with Discord API
│   └── index.js              # Bot entry point
├── data/                     # Auto-created — SQLite DB lives here
├── .env.example
├── .gitignore
└── package.json
```

---

## 🚀 Setup Guide

### 1. Clone / Download the Project

```bash
cd timerbot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
BOT_TOKEN=your_bot_token_here
CLIENT_ID=your_application_client_id
GUILD_ID=your_guild_id         # optional — for instant dev commands
DEFAULT_TIMEZONE=Asia/Kolkata  # your preferred default timezone
DB_PATH=./data/timers.db
LOG_LEVEL=info
```

### 4. Get Your Bot Token & Client ID

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application → **Bot** tab → **Reset Token**
3. Copy the token into `BOT_TOKEN`
4. Copy the **Application ID** into `CLIENT_ID`

### 5. Invite the Bot to Your Server

Use this URL (replace `YOUR_CLIENT_ID`):

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=536938512&scope=bot%20applications.commands
```

Required permissions:
- `Manage Channels` (to edit VC permissions)
- `Send Messages`
- `Embed Links`
- `View Channels`

### 6. Register Slash Commands

```bash
npm run deploy
```

> With `GUILD_ID` set: commands appear **instantly**.  
> Without `GUILD_ID`: commands propagate **globally** (up to 1 hour).

### 7. Start the Bot

```bash
# Production
npm start

# Development (auto-restart on changes)
npm run dev
```

---

## 📋 Command Reference

### `/setupvc`
Configure the bot for your server.

| Option | Required | Description |
|---|---|---|
| `voice_channel` | ✅ | Default VC to manage |
| `announcement_channel` | ✅ | Where open/close messages go |
| `timezone` | ❌ | Server default timezone (autocomplete) |
| `admin_role` | ❌ | Role that can use timer commands |
| `log_channel` | ❌ | Channel for detailed action logs |

---

### `/schedule`
Add a new timer.

| Option | Required | Description |
|---|---|---|
| `label` | ✅ | Event name e.g. "Quarter Finals" |
| `date` | ✅ | `YYYY-MM-DD` format |
| `start_time` | ✅ | 24h `HH:MM` — VC unlocks at this time |
| `end_time` | ✅ | 24h `HH:MM` — VC locks at this time |
| `voice_channel` | ❌ | Override server default VC |
| `announcement_channel` | ❌ | Override server default text channel |
| `timezone` | ❌ | Override server default timezone |

---

### `/listtimers`
Shows all active timers with their IDs, times, and live/pending/ended status.

### `/deletetimer <timer_id>`
Deactivates a timer by its ID (shown in `/listtimers`).

### `/lockvc [voice_channel]`
Immediately locks the VC (denies Connect for @everyone).

### `/unlockvc [voice_channel]`
Immediately unlocks the VC (allows Connect for @everyone).

---

## 🎨 Embed Previews

**VC Opened:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢  MATCH VC OPENED
🎮  The Voice Channel is now OPEN!
🔊  Channel: #tournament-vc
⏰  Session: 14:30 → 16:00
🗓️  Date: 2025-12-25
📌  Event: Quarter Finals Match 1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**VC Closed:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴  MATCH VC CLOSED
🔒  The Voice Channel has been LOCKED!
🔇  Channel: #tournament-vc
⏰  Session ended at: 16:00
📌  Event: Quarter Finals Match 1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🌍 Supported Timezones (examples)

| Timezone | String |
|---|---|
| India Standard Time | `Asia/Kolkata` |
| US Eastern | `America/New_York` |
| US Pacific | `America/Los_Angeles` |
| UTC | `UTC` |
| UK | `Europe/London` |
| Dubai | `Asia/Dubai` |

Full list: [moment-timezone zones](https://momentjs.com/timezone/)

---

## 🛡️ Required Bot Permissions

| Permission | Why |
|---|---|
| `Manage Channels` | Edit VC permission overwrites |
| `Send Messages` | Post announcement embeds |
| `Embed Links` | Render rich embeds |
| `View Channel` | Read channels |
| `Use Application Commands` | Slash commands |

---

## 🧩 Tech Stack

- **[Discord.js v14](https://discord.js.org/)** — Discord API wrapper
- **[better-sqlite3](https://github.com/WiseLibs/better-sqlite3)** — Fast synchronous SQLite
- **[node-cron](https://github.com/node-cron/node-cron)** — Minute-by-minute cron scheduler
- **[moment-timezone](https://momentjs.com/timezone/)** — Timezone parsing and conversion
- **[dotenv](https://github.com/motdotla/dotenv)** — Environment variable management

---

## 📝 License

MIT — use freely for your esports server!
