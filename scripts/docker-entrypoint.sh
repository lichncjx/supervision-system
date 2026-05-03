#!/bin/sh
set -e

echo "Starting supervision app entrypoint..."

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set"
  exit 1
fi

echo "Waiting for database to be ready..."

MAX_RETRIES=60
RETRY_COUNT=0

until node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => client.end())
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
"; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
    echo "ERROR: Database is not ready after ${MAX_RETRIES} retries"
    exit 1
  fi
  echo "Database not ready yet, retry ${RETRY_COUNT}/${MAX_RETRIES}..."
  sleep 2
done

echo "Database is ready."

echo "Running database migration..."
npx prisma migrate deploy
echo "Database migration completed."

echo "Generating Prisma Client..."
npx prisma generate
echo "Prisma Client generated."

echo "Starting Next.js app..."
exec "$@"
