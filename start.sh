#!/bin/bash

# S+ Lab LLM Council - Start script

# Check for --host flag
HOST_MODE=false
for arg in "$@"; do
    if [ "$arg" = "--host" ]; then
        HOST_MODE=true
    fi
done

echo "Starting S+ Lab LLM Council..."
echo ""

# Start backend
echo "Starting backend..."
uv run python -m backend.main &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 2

# Start frontend
echo "Starting frontend..."
cd frontend
HOST_MODE=$HOST_MODE npm run dev &
FRONTEND_PID=$!

# Start ngrok if --host flag is provided
NGROK_PID=""
if [ "$HOST_MODE" = true ]; then
    sleep 2
    echo "Starting ngrok tunnel..."
    ngrok http 5173 --log=stdout > /dev/null 2>&1 &
    NGROK_PID=$!
    sleep 3
    # Get the ngrok URL
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[^"]*\.ngrok[^"]*' | head -1)
fi

echo ""
echo "✓ S+ Lab LLM Council is running!"
echo "  Backend:  http://localhost:8001"
echo "  Frontend: http://localhost:5173"
if [ "$HOST_MODE" = true ] && [ -n "$NGROK_URL" ]; then
    echo "  Public:   $NGROK_URL"
fi
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for Ctrl+C
cleanup() {
    kill $BACKEND_PID $FRONTEND_PID $NGROK_PID 2>/dev/null
    exit
}
trap cleanup SIGINT SIGTERM
wait
