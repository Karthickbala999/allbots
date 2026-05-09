@echo off
title NKG BOT - BACKGROUND LOGS
cd /d "%~dp0"

echo Press CTRL+C to stop viewing logs. The bot will keep running.
echo.
call npm.cmd run background:logs
