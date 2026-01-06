# PowerShell script to restart the server cleanly
Write-Host "Stopping all Node.js processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

Write-Host "Checking port 4000..." -ForegroundColor Yellow
$portCheck = netstat -ano | findstr :4000 | findstr LISTENING
if ($portCheck) {
    Write-Host "Port 4000 is still in use. Killing processes..." -ForegroundColor Red
    $pids = netstat -ano | findstr :4000 | findstr LISTENING | ForEach-Object { ($_ -split '\s+')[-1] }
    $pids | ForEach-Object { taskkill /PID $_ /F }
    Start-Sleep -Seconds 2
}

Write-Host "Starting server..." -ForegroundColor Green
Set-Location $PSScriptRoot\..
npm run dev:server



