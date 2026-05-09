@echo off
title BOT STATUS CHECK
echo ========================================
echo       CURRENT BOT STATUS
echo ========================================
echo.

call npx pm2 status

echo.
echo ========================================
echo You can close this terminal.
echo ========================================
pause
