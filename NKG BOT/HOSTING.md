# Hosting NKG BOT 24/7

The bot cannot run while your laptop is fully shut down. To stay in VC 24/7, run it on an always-on host.

## What To Deploy

This project is ready for worker-style hosting:

- Start command: `node index.js`
- Procfile command: `worker: node index.js`
- Docker command: `node index.js`

Never upload your real `.env` file publicly. Add the values from `.env.example` as secret/environment variables in your host dashboard.

Required variables:

- `TOKEN`
- `CLIENT_ID`
- `GUILD_ID`
- `VOICE_CHANNEL_ID`

## Oracle Cloud Always Free

See `ORACLE.md`.

After you create an Ubuntu Always Free VM in Oracle Cloud, run:

```bat
deploy-oracle.bat
```

This uploads the project to the VM, installs Node.js and PM2, starts the bot, and enables restart after VM reboot.

## Recommended Simple Option: Railway

Run:

```bat
deploy-railway.bat
```

The script will:

- Ask you to login to Railway in your browser.
- Create/link a Railway project named `nkg-bot`.
- Create a worker service named `nkg-bot`.
- Copy the required values from your local `.env` into Railway variables.
- Deploy the bot.

Do not paste your Discord token into chat. The script reads it locally from `.env`.

## Docker/VPS Option

On a Linux VPS with Docker installed:

```bash
docker build -t nkg-bot .
docker run -d --name nkg-bot --restart unless-stopped \
  --env-file .env \
  nkg-bot
```

Check logs:

```bash
docker logs -f nkg-bot
```

Restart:

```bash
docker restart nkg-bot
```

Stop:

```bash
docker stop nkg-bot
```

## Important

Free web hosting plans often sleep when idle. A Discord VC bot needs a host that keeps worker/background processes awake.
