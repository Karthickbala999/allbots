@echo off
title NKG BOT - DEPLOY TO ORACLE VM
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-oracle.ps1"

echo.
pause
