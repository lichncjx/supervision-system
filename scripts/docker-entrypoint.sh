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
const net = require('net');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(databaseUrl);
} catch (error) {
  console.error('Invalid DATABASE_URL:', error.message);
  process.exit(1);
}

const host = parsed.hostname;
const port = Number(parsed.port || 5432);

const socket = new net.Socket();

socket.setTimeout(2000);

socket.once('connect', () => {
  socket.destroy();
  process.exit(0);
});

socket.once('timeout', () => {
  socket.destroy();
  process.exit(1);
});

socket.once('error', () => {
  socket.destroy();
  process.exit(1);
});

socket.connect(port, host);
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
./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma
echo "Database migration completed."

echo "Starting Next.js app..."
exec "$@"