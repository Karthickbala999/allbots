@echo off
title STARTING ALL BOTS
echo Starting all bots via Manager...
cd /d "%~dp0BOT_MANAGER"
call START_ALL_BOTS.bat
pause
