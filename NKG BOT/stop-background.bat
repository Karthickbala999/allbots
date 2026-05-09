@echo off
title NKG BOT - STOP BACKGROUND
cd /d "%~dp0"

call npm.cmd run background:stop
call npm.cmd run background:save

echo.
echo NKG BOT background process has been stopped.
echo.
pause
