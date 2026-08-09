# ERP Operations Portal - Dual Development Server Launcher
Write-Host "====================================================" -ForegroundColor CipherText
Write-Host "🚀 Starting ERP Portal (Backend + Frontend)" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor CipherText

Set-Location $PSScriptRoot
npm run dev
