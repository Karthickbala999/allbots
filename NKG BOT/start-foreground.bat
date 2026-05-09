@echo off
title NKG BOT - FOREGROUND AUTO RESTART
cd /d "%~dp0"

:start
node index.js
echo Bot crashed or stopped. Restarting in 5 seconds...
timeout /t 5
goto start
