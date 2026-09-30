# ====================================================================
# Personal AI Knowledge Assistant - One-Command Startup Script (PowerShell)
# ====================================================================

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  Starting Personal AI Knowledge Assistant           " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

$ROOT_DIR = $PSScriptRoot
$BACKEND_DIR = Join-Path $ROOT_DIR "backend"
$FRONTEND_DIR = Join-Path $ROOT_DIR "frontend"

# 1. Check Python
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    $pythonCmd = Get-Command python3 -ErrorAction SilentlyContinue
}
if (-not $pythonCmd) {
    Write-Host "[ERROR] Python is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Python 3.10+ from https://www.python.org/" -ForegroundColor Yellow
    Exit 1
}
Write-Host "[OK] Found Python: $($pythonCmd.Source)" -ForegroundColor Green

# 2. Check Node & NPM
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Host "[ERROR] Node.js is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Yellow
    Exit 1
}
Write-Host "[OK] Found Node.js: $($nodeCmd.Source)" -ForegroundColor Green

# 3. Setup Backend Virtual Environment & .env
Set-Location $BACKEND_DIR

$VENV_DIR = Join-Path $BACKEND_DIR ".venv"
if (-not (Test-Path $VENV_DIR)) {
    Write-Host "[INFO] Creating Python virtual environment in backend/.venv..." -ForegroundColor Yellow
    & python -m venv .venv
}

$VENV_PYTHON = Join-Path $VENV_DIR "Scripts\python.exe"
if (-not (Test-Path $VENV_PYTHON)) {
    $VENV_PYTHON = "python"
}

# Copy .env if not present
if (-not (Test-Path (Join-Path $BACKEND_DIR ".env"))) {
    if (Test-Path (Join-Path $BACKEND_DIR ".env.example")) {
        Copy-Item ".env.example" -Destination ".env"
        Write-Host "[INFO] Created backend/.env from .env.example" -ForegroundColor Yellow
    }
}

# 4. Check Frontend node_modules
Set-Location $FRONTEND_DIR
if (-not (Test-Path (Join-Path $FRONTEND_DIR "node_modules"))) {
    Write-Host "[INFO] Installing frontend dependencies with npm install..." -ForegroundColor Yellow
    npm install
}

# 5. Start Backend and Frontend
Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  Launching Services:                                " -ForegroundColor Cyan
Write-Host "  - Backend API:  http://localhost:8000 (Swagger: /docs)" -ForegroundColor Green
Write-Host "  - Frontend App: http://localhost:5173              " -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop all servers." -ForegroundColor Gray
Write-Host ""

# Start backend job
$backendProcess = Start-Process -FilePath $VENV_PYTHON -ArgumentList "-m uvicorn main:app --reload --host 127.0.0.1 --port 8000" -WorkingDirectory $BACKEND_DIR -PassThru

# Start frontend in current window
try {
    npm run dev
}
finally {
    Write-Host "[INFO] Stopping backend server (PID: $($backendProcess.Id))..." -ForegroundColor Yellow
    Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    Write-Host "[OK] All services stopped." -ForegroundColor Green
}
