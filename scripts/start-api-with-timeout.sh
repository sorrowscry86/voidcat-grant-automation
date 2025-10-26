#!/bin/bash
# Start API server with timeout and health check validation
# Usage: ./scripts/start-api-with-timeout.sh [timeout_seconds] [port]

set -e

TIMEOUT=${1:-30}
PORT=${2:-8787}
API_DIR="$(cd "$(dirname "$0")/.." && pwd)/api"
LOG_FILE="/tmp/wrangler-startup.log"
PID_FILE="/tmp/wrangler.pid"

echo "🚀 Starting VoidCat Grant Search API..."
echo "   Port: $PORT"
echo "   Timeout: ${TIMEOUT}s"
echo "   API Directory: $API_DIR"
echo ""

# Clean up any existing processes
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo "⚠️  Stopping existing API server (PID: $OLD_PID)..."
        kill "$OLD_PID" 2>/dev/null || true
        sleep 2
    fi
    rm -f "$PID_FILE"
fi

# Check if dependencies are installed
if [ ! -d "$API_DIR/node_modules" ] || [ -z "$(ls -A "$API_DIR/node_modules" 2>/dev/null)" ]; then
    echo "📦 Installing API dependencies..."
    cd "$API_DIR" && npm install
fi

# Start wrangler in background
echo "🔄 Starting wrangler dev server..."
cd "$API_DIR"
npx wrangler dev --local --port "$PORT" > "$LOG_FILE" 2>&1 &
WRANGLER_PID=$!
echo $WRANGLER_PID > "$PID_FILE"

echo "   Process ID: $WRANGLER_PID"
echo ""

# Wait for API to be ready with timeout
echo "⏳ Waiting for API to be ready (timeout: ${TIMEOUT}s)..."
START_TIME=$(date +%s)
READY=false

while [ $(($(date +%s) - START_TIME)) -lt "$TIMEOUT" ]; do
    # Check if process is still running
    if ! ps -p "$WRANGLER_PID" > /dev/null 2>&1; then
        echo "❌ API process died unexpectedly"
        echo "📋 Last 20 lines of log:"
        tail -20 "$LOG_FILE"
        exit 1
    fi
    
    # Try to connect to health endpoint
    if curl -s -f "http://localhost:$PORT/health" > /dev/null 2>&1; then
        READY=true
        break
    fi
    
    # Show progress
    ELAPSED=$(($(date +%s) - START_TIME))
    echo -ne "\r   Elapsed: ${ELAPSED}s / ${TIMEOUT}s"
    
    sleep 1
done

echo ""
echo ""

if [ "$READY" = true ]; then
    ELAPSED=$(($(date +%s) - START_TIME))
    echo "✅ API server is ready! (started in ${ELAPSED}s)"
    echo ""
    echo "🔍 Health check response:"
    curl -s "http://localhost:$PORT/health" | jq . 2>/dev/null || curl -s "http://localhost:$PORT/health"
    echo ""
    echo ""
    echo "📍 API Endpoints:"
    echo "   Health: http://localhost:$PORT/health"
    echo "   Search: http://localhost:$PORT/api/grants/search?query=AI"
    echo "   Root:   http://localhost:$PORT/"
    echo ""
    echo "🛑 To stop: kill $WRANGLER_PID  OR  kill \$(cat $PID_FILE)"
    echo "📋 Logs:    tail -f $LOG_FILE"
    echo ""
else
    ELAPSED=$(($(date +%s) - START_TIME))
    echo "❌ API server failed to start within ${TIMEOUT}s timeout"
    echo ""
    echo "📋 Last 30 lines of log:"
    tail -30 "$LOG_FILE"
    echo ""
    
    # Clean up
    kill "$WRANGLER_PID" 2>/dev/null || true
    rm -f "$PID_FILE"
    exit 1
fi
