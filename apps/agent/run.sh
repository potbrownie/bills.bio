#!/usr/bin/env bash
# Run the Bill's agent (restarts any existing uvicorn on port 8000).
# Usage: from repo root: ./agent/run.sh   or from agent/: ./run.sh

set -e
cd "$(dirname "$0")"

# Kill existing agent on port 8000
pkill -f "uvicorn main:app" 2>/dev/null || true
sleep 1

# Activate venv if present
if [ -d "venv" ]; then
  source venv/bin/activate
fi

exec uvicorn main:app --host 0.0.0.0 --port 8000
