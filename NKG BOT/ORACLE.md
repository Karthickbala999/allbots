# Oracle Cloud Always Free Deployment

Your bot can run 24/7 on an Oracle Cloud Always Free VM. Your laptop can be shut down after the bot is running on the VM.

## What You Need To Do In Browser

1. Create/login to Oracle Cloud.
2. Create an Always Free Compute VM.
3. Use Ubuntu as the image.
4. Save/download the SSH private key.
5. Copy the VM public IP.

Use only resources marked Always Free eligible.

## Deploy From This Laptop

Run:

```bat
deploy-oracle.bat
```

It asks for:

- Oracle VM public IP
- SSH username, usually `ubuntu`
- Full path to the SSH private key file

Then it uploads the bot, installs Node.js and PM2, starts the bot, and enables restart after VM reboot.

## Server Commands

After SSHing into the VM:

```bash
pm2 status
pm2 logs nkg-bot
pm2 restart nkg-bot
pm2 stop nkg-bot
```

## Notes

- Do not share your Discord token in chat.
- The script uploads your local `.env` securely over SSH to your Oracle VM.
- Keep the Oracle VM running for 24/7 uptime.
