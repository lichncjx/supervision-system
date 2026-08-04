#!/bin/sh
set -eu

if [ ! -f ".env" ]; then
  echo "ERROR: .env not found; create it from .env.example" >&2
  exit 1
fi

echo "Pulling app image..."
docker-compose pull app

echo "Starting database and application..."
docker-compose up -d db
docker-compose up -d --no-deps app

echo "Cleaning dangling images..."
docker image prune -f

docker-compose ps
