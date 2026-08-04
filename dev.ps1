# Runs backend (auto-reload) and frontend (Vite dev server) separately, for development.
# Opens two windows. Use start.ps1 instead for normal day-to-day use.

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\server'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\client'; npm run dev -- --host"
