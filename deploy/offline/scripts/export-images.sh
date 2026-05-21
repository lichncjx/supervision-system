#!/bin/sh
set -eu

TAG="${1:-20260521}"
OUT_DIR="${2:-offline-release/images}"
RELEASE_ROOT="$(dirname "$OUT_DIR")"
OFFLINE_DIR="$RELEASE_ROOT/deploy/offline"

mkdir -p "$OUT_DIR"
mkdir -p "$OFFLINE_DIR/scripts"

docker save "supervision-system-app:$TAG" | gzip > "$OUT_DIR/supervision-system-app_$TAG.tar.gz"
docker save "supervision-system-migrate:$TAG" | gzip > "$OUT_DIR/supervision-system-migrate_$TAG.tar.gz"
docker save "supervision-system-seed:$TAG" | gzip > "$OUT_DIR/supervision-system-seed_$TAG.tar.gz"
docker save postgres:16 | gzip > "$OUT_DIR/postgres_16.tar.gz"

sed \
  -e "s/supervision-system-app:[^[:space:]]*/supervision-system-app:$TAG/g" \
  -e "s/supervision-system-migrate:[^[:space:]]*/supervision-system-migrate:$TAG/g" \
  -e "s/supervision-system-seed:[^[:space:]]*/supervision-system-seed:$TAG/g" \
  deploy/offline/docker-compose.yml > "$OFFLINE_DIR/docker-compose.yml"

cp deploy/offline/.env.production.template "$OFFLINE_DIR/.env.production.template"
cp deploy/offline/README.md "$OFFLINE_DIR/README.md"
cp deploy/offline/scripts/build-images.sh "$OFFLINE_DIR/scripts/build-images.sh"
cp deploy/offline/scripts/export-images.sh "$OFFLINE_DIR/scripts/export-images.sh"
cp deploy/offline/scripts/load-images.sh "$OFFLINE_DIR/scripts/load-images.sh"
