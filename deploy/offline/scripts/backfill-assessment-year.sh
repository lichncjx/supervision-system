#!/bin/sh
set -eu

MODE="${1:-}"
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
RELEASE_ROOT="${2:-$(dirname "$SCRIPT_DIR")}"
DEFAULT_YEAR="${DEFAULT_YEAR:-2026}"

case "$MODE" in
  --dry-run|--apply) ;;
  *)
    echo "usage: sh scripts/backfill-assessment-year.sh --dry-run|--apply [release-root]" >&2
    exit 1
    ;;
esac

if [ ! -f "$RELEASE_ROOT/docker-compose.yml" ] || [ ! -f "$RELEASE_ROOT/.env.production" ]; then
  echo "docker-compose.yml or .env.production not found in: $RELEASE_ROOT" >&2
  exit 1
fi

if [ "$(docker inspect -f '{{.State.Running}}' supervision-db 2>/dev/null || true)" != "true" ]; then
  echo "supervision-db must already be running" >&2
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

cd "$RELEASE_ROOT"
compose run --no-deps --rm ops \
  ./node_modules/.bin/tsx \
  scripts/deployment-migrations/20260710-backfill-assessment-year.ts \
  "--default-year=$DEFAULT_YEAR" "$MODE"
