#!/bin/bash
# ====================================================================
# Personal AI Knowledge Assistant - One-Command Startup Script (Bash)
# ====================================================================

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$DIR/backend"
FRONTEND_DIR="$DIR/frontend"

echo "======================================================"
echo "  Starting Personal AI Knowledge Assistant           "
echo "======================================================"

# 1. Backend virtual environment
cd "$BACKEND_DIR"
if [ ! -d ".venv" ]; then
    echo "[INFO] Creating Python virtualenv..."
    python3 -m venv .venv
fi
source .venv/bin/activate

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    cp .env.example .env
fi

echo "[INFO] Launching FastAPI backend on http://localhost:8000 ..."
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

# Trap exit to kill backend
cleanup() {
    echo ""
    echo "[INFO] Shutting down backend (PID: $BACKEND_PID)..."
    kill $BACKEND_PID 2>/dev/null || true
    echo "[OK] Clean exit."
}
trap cleanup EXIT INT TERM

# 2. Frontend setup & dev server
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
    echo "[INFO] Installing frontend dependencies..."
    npm install
fi

echo "[INFO] Launching Vite frontend on http://localhost:5173 ..."
npm run dev
