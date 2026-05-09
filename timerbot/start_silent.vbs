Dim botDir, logFile, cmd
botDir  = "C:\Users\karth\OneDrive\Desktop\timerbot"
logFile = botDir & "\bot.log"

cmd = "cmd /c node """ & botDir & "\src\index.js"" >> """ & logFile & """ 2>&1"

Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = botDir
WshShell.Run cmd, 0, False
Set WshShell = Nothing

MsgBox "✅ Timer Bot started in background!" & vbCrLf & "Logs: " & logFile, 64, "Timer Bot"
