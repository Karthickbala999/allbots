@echo off
title STARTING ALL BOTS...
echo ========================================
echo       NKG BOT CONTROL CENTER
echo ========================================
echo.
echo [1/2] Starting all bots in background...
echo.

:: Using npx to ensure pm2 is available without global install
call npx pm2 start ecosystem.config.cjs

echo.
echo [2/2] Saving state for auto-reboot...
call npx pm2 save

echo.
echo ========================================
echo All bots are now running in the background!
echo You can safely CLOSE this terminal.
echo ========================================
echo.
pause
