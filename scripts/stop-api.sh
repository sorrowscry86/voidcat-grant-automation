#!/bin/bash
# Stop API server
# Usage: ./scripts/stop-api.sh

PID_FILE="/tmp/wrangler.pid"

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "🛑 Stopping API server (PID: $PID)..."
        kill "$PID" 2>/dev/null || true
        sleep 2
        
        # Force kill if still running
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "   Force killing..."
            kill -9 "$PID" 2>/dev/null || true
        fi
        
        echo "✅ API server stopped"
    else
        echo "⚠️  No running API server found with PID: $PID"
    fi
    rm -f "$PID_FILE"
else
    echo "⚠️  No PID file found. Checking for any wrangler processes..."
    
    # Try to find and kill any wrangler dev processes
    WRANGLER_PIDS=$(pgrep -f "wrangler dev" || true)
    if [ -n "$WRANGLER_PIDS" ]; then
        echo "   Found wrangler processes: $WRANGLER_PIDS"
        echo "$WRANGLER_PIDS" | xargs kill 2>/dev/null || true
        sleep 1
        echo "✅ Wrangler processes stopped"
    else
        echo "   No wrangler processes found"
    fi
fi
