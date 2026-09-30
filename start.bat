@echo off
title Personal AI Knowledge Assistant - Starter
echo ======================================================
echo   Starting Personal AI Knowledge Assistant
echo ======================================================

cd /d "%~dp0backend"
if not exist ".env" (
    if exist ".env.example" copy ".env.example" ".env"
)

echo Starting Backend Server on http://localhost:8000 ...
start "Backend (FastAPI)" cmd /k "python -m uvicorn main:app --reload --port 8000"

cd /d "%~dp0frontend"
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
)

echo Starting Frontend Dev Server on http://localhost:5173 ...
call npm run dev
