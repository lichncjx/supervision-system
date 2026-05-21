#!/bin/sh
set -eu

TAG="${1:-20260521}"
OUT_DIR="${2:-offline-release/images}"

mkdir -p "$OUT_DIR"

docker save "supervision-system-app:$TAG" | gzip > "$OUT_DIR/supervision-system-app_$TAG.tar.gz"
docker save "supervision-system-migrate:$TAG" | gzip > "$OUT_DIR/supervision-system-migrate_$TAG.tar.gz"
docker save "supervision-system-seed:$TAG" | gzip > "$OUT_DIR/supervision-system-seed_$TAG.tar.gz"
docker save postgres:16 | gzip > "$OUT_DIR/postgres_16.tar.gz"
