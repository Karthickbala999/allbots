@echo off
title NKG BOT - DEPLOY TO RAILWAY
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-railway.ps1"

echo.
pause
