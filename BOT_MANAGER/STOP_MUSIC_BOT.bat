@echo off
title STOPPING MUSIC BOT
echo ========================================
echo       STOPPING MUSIC BOT...
echo ========================================
echo.

call npx pm2 stop MUSIC-BOT

echo.
echo MUSIC BOT has been stopped.
echo ========================================
pause
