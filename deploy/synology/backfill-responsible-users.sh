#!/bin/sh
set -e

echo "======================================"
echo "Backfilling responsible user fields..."
echo "======================================"

if [ ! -f ".env" ]; then
  echo "ERROR: .env not found"
  echo "Please create .env based on .env.example"
  exit 1
fi

echo "Starting database..."
docker-compose up -d db

echo "Running responsible user backfill..."
docker-compose run --rm migrate sh -c "node ./scripts/wait-for-db.mjs && ./node_modules/.bin/tsx docs/superpowers/scripts/backfill-responsible-users.ts"

echo "Backfill completed. Review the report above before deploying the app."

echo "======================================"
echo "After backfill, run deploy.sh to restart the app:"
echo "  ./deploy.sh"
echo "======================================"
