@echo off
echo Stopping Timer Bot...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq TimerBot" >nul 2>&1
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq node.exe" /fo list ^| find "PID"') do (
    wmic process where "ProcessId=%%i AND CommandLine LIKE '%%timerbot%%'" delete >nul 2>&1
)
echo Done. Bot stopped.
pause
