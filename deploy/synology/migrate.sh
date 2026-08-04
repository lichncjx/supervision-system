#!/bin/sh
set -eu

if [ ! -f ".env" ]; then
  echo "ERROR: .env not found; create it from .env.example" >&2
  exit 1
fi

echo "Pulling ops image..."
docker-compose pull ops

echo "Starting database..."
docker-compose up -d db

echo "Applying pending database migrations..."
docker-compose run --rm ops

echo "Migration completed. Run sh deploy.sh to publish the app."
