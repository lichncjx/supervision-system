#!/bin/sh
set -e

echo "======================================"
echo "Running database migration..."
echo "======================================"

if [ ! -f ".env" ]; then
  echo "ERROR: .env not found"
  echo "Please create .env based on .env.example"
  exit 1
fi

echo "Pulling latest migrate image..."
docker-compose pull migrate

echo "Starting database..."
docker-compose up -d db

echo "Running database migration..."
docker-compose run --rm migrate

echo "Migration completed."

echo "======================================"
echo "After migration, run deploy.sh to restart the app:"
echo "  ./deploy.sh"
echo "======================================"