@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "[IO.File]::WriteAllText((Join-Path '%~dp0' '.stop-server'), 'stop')"
