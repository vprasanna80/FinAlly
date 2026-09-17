#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="finally-app"

if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
    echo "Stopping and removing container '$CONTAINER_NAME'..."
    docker rm -f "$CONTAINER_NAME" >/dev/null
    echo "Stopped. Data volume 'finally-data' was preserved."
else
    echo "Container '$CONTAINER_NAME' is not running."
fi
