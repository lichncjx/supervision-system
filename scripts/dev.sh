#!/bin/sh
set -e

PORT=5000
COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
DEPLOY_RUN_PORT=5000

cd "${COZE_WORKSPACE_PATH}"

echo "Starting HTTP service on port ${PORT} for dev..."
PORT=$PORT pnpm tsx watch src/server.ts
