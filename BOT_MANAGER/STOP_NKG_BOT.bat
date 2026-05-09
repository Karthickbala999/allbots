@echo off
title STOPPING NKG BOT
echo ========================================
echo       STOPPING NKG BOT...
echo ========================================
echo.

call npx pm2 stop NKG-BOT

echo.
echo NKG BOT has been stopped.
echo ========================================
pause
