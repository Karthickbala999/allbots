@echo off
title NKG BOT - BACKGROUND STATUS
cd /d "%~dp0"

call npm.cmd run background:status

echo.
pause
