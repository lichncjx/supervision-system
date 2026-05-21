#!/bin/sh
set -eu

# 从项目根目录执行此脚本
# 用法: sh deploy/offline/scripts/build-images.sh [TAG]

TAG="${1:-20260521}"
PROJECT_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

docker build --target app -t "supervision-system-app:$TAG" -f "$PROJECT_ROOT/Dockerfile" "$PROJECT_ROOT"
docker build --target migrate -t "supervision-system-migrate:$TAG" -f "$PROJECT_ROOT/Dockerfile" "$PROJECT_ROOT"
docker build --target seed -t "supervision-system-seed:$TAG" -f "$PROJECT_ROOT/Dockerfile" "$PROJECT_ROOT"
