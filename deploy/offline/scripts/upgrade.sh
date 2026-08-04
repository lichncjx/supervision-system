#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
RELEASE_ROOT="${1:-$(dirname "$SCRIPT_DIR")}"
MODE="${2:-full}"

case "$MODE" in
  full|--migrate-only|--restart-app) ;;
  *)
    echo "usage: sh scripts/upgrade.sh [release-root] [--migrate-only|--restart-app]" >&2
    exit 1
    ;;
esac

if [ ! -f "$RELEASE_ROOT/docker-compose.yml" ] || [ ! -f "$RELEASE_ROOT/.env.production" ]; then
  echo "docker-compose.yml or .env.production not found in: $RELEASE_ROOT" >&2
  exit 1
fi

if [ "$(docker inspect -f '{{.State.Running}}' supervision-db 2>/dev/null || true)" != "true" ]; then
  echo "supervision-db must already be running; this script never starts or replaces the database" >&2
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  compose() { docker compose "$@"; }
elif command -v docker-compose >/dev/null 2>&1; then
  compose() { docker-compose "$@"; }
else
  echo "docker compose or docker-compose is required" >&2
  exit 1
fi

mkdir -p "$RELEASE_ROOT/backup"

if [ "$MODE" != "--restart-app" ]; then
  BACKUP_FILE="$RELEASE_ROOT/backup/supervision_$(date +%Y%m%d_%H%M%S).sql"
  docker exec supervision-db pg_dump -U supervision supervision > "$BACKUP_FILE"
  echo "Database backup created: $BACKUP_FILE"
  sh "$RELEASE_ROOT/scripts/load-images.sh" "$RELEASE_ROOT"
fi

cd "$RELEASE_ROOT"

if [ "$MODE" != "--restart-app" ]; then
  compose run --no-deps --rm ops
fi

if [ "$MODE" != "--migrate-only" ]; then
  compose up -d --no-deps app
fi

compose ps app
