#!/usr/bin/env bash

# ==============================================================================
# AlphaGreeks - Indian Options Greeks & Risk-Reward Analyser
# Launcher script that can be executed from ANY directory in the system.
# ==============================================================================

set -e

# Project root directory
PROJECT_DIR="/Users/jay/.gemini/antigravity-ide/scratch/options-analyser"

# Ensure project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Error: Project directory not found at $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"

# Preferred port, or check for next available port starting from 8085
PORT=8085
while lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; do
    echo "ℹ️  Port $PORT is already in use. Checking next port..."
    PORT=$((PORT + 1))
done

URL="http://localhost:$PORT"

echo "=============================================================="
echo "⚡ Starting AlphaGreeks Options Terminal..."
echo "📍 Directory : $PROJECT_DIR"
echo "🌐 URL       : $URL"
echo "=============================================================="

# Open default browser on macOS after a brief delay
(
    sleep 0.8
    if command -v open >/dev/null 2>&1; then
        open "$URL"
    fi
) &

# Graceful exit handler
cleanup() {
    echo ""
    echo "🛑 Stopping AlphaGreeks server..."
    exit 0
}
trap cleanup SIGINT SIGTERM

# Start server using Python 3 with Zerodha Kite Connect Bridge
python3 server.py "$PORT"
