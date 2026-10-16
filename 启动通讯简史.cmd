@echo off
setlocal
if exist "%~dp0.stop-server" del "%~dp0.stop-server"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$server=Join-Path '%~dp0' 'serve.ps1'; Start-Process -FilePath powershell.exe -WindowStyle Hidden -ArgumentList ('-NoProfile -ExecutionPolicy Bypass -File "' + $server + '"'); Start-Sleep -Seconds 1; Start-Process 'http://127.0.0.1:8765/'"
