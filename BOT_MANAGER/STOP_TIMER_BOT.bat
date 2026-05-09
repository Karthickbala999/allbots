@echo off
title STOPPING TIMER BOT
echo ========================================
echo       STOPPING TIMER BOT...
echo ========================================
echo.

call npx pm2 stop TIMER-BOT

echo.
echo TIMER BOT has been stopped.
echo ========================================
pause
