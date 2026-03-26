#!/usr/bin/env pwsh
# InspectFlow - Automated Setup Script for Windows
# This script automates the Supabase setup process

Write-Host "🚀 InspectFlow - Supabase Setup Script" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "📦 Checking Docker Desktop..." -ForegroundColor Yellow
$dockerRunning = docker info 2>&1 | Select-String "Server Version"
if (-not $dockerRunning) {
    Write-Host "❌ Docker Desktop is not running!" -ForegroundColor Red
    Write-Host "   Please start Docker Desktop and run this script again." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker is running" -ForegroundColor Green
Write-Host ""

# Check if Node.js is installed
Write-Host "📦 Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    Write-Host "   Please install Node.js from https://nodejs.org" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js $nodeVersion detected" -ForegroundColor Green
Write-Host ""

# Install npm dependencies
Write-Host "📦 Installing npm dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Check if Supabase is already initialized
if (Test-Path "supabase/config.toml") {
    Write-Host "✅ Supabase already initialized" -ForegroundColor Green
} else {
    Write-Host "🔧 Initializing Supabase..." -ForegroundColor Yellow
    npx supabase init
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to initialize Supabase" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Supabase initialized" -ForegroundColor Green
}
Write-Host ""

# Start Supabase
Write-Host "🚀 Starting Supabase..." -ForegroundColor Yellow
Write-Host "   (This may take a few minutes on first run)" -ForegroundColor Gray
npx supabase start
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start Supabase" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Get Supabase status and extract Anon key
Write-Host "📋 Getting Supabase credentials..." -ForegroundColor Yellow
$supabaseStatus = npx supabase status

# Parse the anon key from status output
$anonKey = ($supabaseStatus | Select-String "anon key: (.+)").Matches.Groups[1].Value

if (-not $anonKey) {
    Write-Host "⚠️  Could not automatically extract Anon key" -ForegroundColor Yellow
    Write-Host "   Please manually check the output above and update .env.local" -ForegroundColor Yellow
} else {
    # Create .env.local file
    Write-Host "📝 Creating .env.local file..." -ForegroundColor Yellow
    @"
# Supabase Configuration
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=$anonKey
"@ | Out-File -FilePath ".env.local" -Encoding UTF8
    Write-Host "✅ .env.local file created" -ForegroundColor Green
}
Write-Host ""

# Display summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 Supabase API URL:    http://localhost:54321" -ForegroundColor White
Write-Host "📍 Supabase Studio UI:  http://localhost:54323" -ForegroundColor White
Write-Host "📍 Your App:            http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Run: npm run dev" -ForegroundColor White
Write-Host "  2. Open: http://localhost:5173" -ForegroundColor White
Write-Host "  3. Visit Supabase Studio at http://localhost:54323 to manage your database" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Happy coding!" -ForegroundColor Green
