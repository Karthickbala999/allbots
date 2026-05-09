@echo off
title NKG BOT - BACKGROUND START
cd /d "%~dp0"

call npm.cmd run background
call npm.cmd run background:save

echo.
echo NKG BOT is now running in the background with PM2.
echo You can close this window now.
echo.
echo Useful files:
echo   status-background.bat  - check running status
echo   logs-background.bat    - watch logs
echo   stop-background.bat    - stop the bot
echo.
pause
