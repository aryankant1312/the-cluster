@echo off
setlocal
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\boot-local.ps1"
if errorlevel 1 (
  echo.
  echo THE CLUSTER could not be started. See .data\boot-server-error.log.
  pause
  exit /b 1
)

exit /b 0
