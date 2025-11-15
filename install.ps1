# PowerShell Installation Script for AMBUCLEAR
# Run this script to automatically set up the project

Write-Host "🚑 AMBUCLEAR - Emergency Vehicle Smart Alert System" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js installation
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node --version
    Write-Host "✓ Node.js installed: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Node.js not found. Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check npm installation
if (Get-Command npm -ErrorAction SilentlyContinue) {
    $npmVersion = npm --version
    Write-Host "✓ npm installed: v$npmVersion" -ForegroundColor Green
} else {
    Write-Host "✗ npm not found. Please install npm" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dependencies installed successfully!" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path .env.local) {
    Write-Host "✓ .env.local file found" -ForegroundColor Green
} else {
    Write-Host "! .env.local not found. Creating from template..." -ForegroundColor Yellow
    Copy-Item .env.local .env.local
    Write-Host "⚠ Please edit .env.local and add your API keys" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Creating data directory..." -ForegroundColor Yellow
if (!(Test-Path data)) {
    New-Item -ItemType Directory -Path data | Out-Null
    Write-Host "✓ Data directory created" -ForegroundColor Green
} else {
    Write-Host "✓ Data directory already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "✅ Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Edit .env.local and add your API keys (optional)" -ForegroundColor White
Write-Host "  2. Run: npm run dev" -ForegroundColor White
Write-Host "  3. Open: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Quick commands:" -ForegroundColor Yellow
Write-Host "  npm run dev   - Start development server" -ForegroundColor White
Write-Host "  npm run build - Build for production" -ForegroundColor White
Write-Host "  npm start     - Start production server" -ForegroundColor White
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Yellow
Write-Host "  README.md       - Full documentation" -ForegroundColor White
Write-Host "  QUICKSTART.md   - Quick start guide" -ForegroundColor White
Write-Host ""
Write-Host "🚑 Ready to save lives! Press any key to start dev server..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host ""
Write-Host "Starting development server..." -ForegroundColor Yellow
npm run dev
