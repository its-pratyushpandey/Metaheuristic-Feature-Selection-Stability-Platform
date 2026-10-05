#!/usr/bin/env bash
set -e

echo "========================================================================="
echo "  Starting Metaheuristic Feature Selection Stability Platform"
echo "========================================================================="

# 1. Start FastAPI Backend on Port 8000
echo "[1/2] Launching FastAPI Backend on http://localhost:8000 ..."
PYTHONPATH=. ./venv/bin/python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# 2. Build and start the Next.js Frontend on Port 3000
echo "[2/2] Building and launching Next.js Frontend on http://localhost:3000 ..."
cd frontend && npm run build && npm run start &
FRONTEND_PID=$!

echo "-------------------------------------------------------------------------"
echo "  Backend API:  http://localhost:8000/docs"
echo "  Frontend App: http://localhost:3000"
echo "  Press Ctrl+C to terminate both servers."
echo "-------------------------------------------------------------------------"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
