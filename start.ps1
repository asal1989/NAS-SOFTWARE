# Builds the web UI and starts the NAS server (single process, single port).
# Run this normally. Use dev.ps1 only when actively developing the app.

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Building web UI..."
Push-Location "$root\client"
npm run build
Pop-Location

Write-Host "Starting NAS server..."
Push-Location "$root\server"
npm start
Pop-Location
