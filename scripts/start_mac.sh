#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

IMAGE_NAME="finally:latest"
CONTAINER_NAME="finally-app"
PORT=8000
BUILD=false
OPEN_BROWSER=true

for arg in "$@"; do
    case "$arg" in
        --build) BUILD=true ;;
        --no-browser) OPEN_BROWSER=false ;;
    esac
done

if [ ! -f ".env" ]; then
    echo "No .env found — copying .env.example. Add your OPENROUTER_API_KEY before using real LLM chat."
    cp .env.example .env
fi

mkdir -p db

if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
    echo "Removing existing container '$CONTAINER_NAME'..."
    docker rm -f "$CONTAINER_NAME" >/dev/null
fi

if [ "$BUILD" = true ] || [ -z "$(docker images -q "$IMAGE_NAME")" ]; then
    echo "Building Docker image '$IMAGE_NAME'..."
    docker build -t "$IMAGE_NAME" .
fi

echo "Starting container '$CONTAINER_NAME' on port $PORT..."
docker run -d \
    --name "$CONTAINER_NAME" \
    -p "${PORT}:8000" \
    -v "finally-data:/app/db" \
    --env-file ".env" \
    "$IMAGE_NAME" >/dev/null

URL="http://localhost:${PORT}"
echo ""
echo "FinAlly is running at $URL"
echo "Stop it with: scripts/stop_mac.sh"

if [ "$OPEN_BROWSER" = true ]; then
    if command -v open >/dev/null 2>&1; then
        open "$URL"
    elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$URL"
    fi
fi
