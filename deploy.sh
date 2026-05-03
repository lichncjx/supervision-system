#!/bin/sh
set -e

echo "======================================"
echo "Deploying supervision system..."
echo "======================================"

if [ ! -f "docker-compose.yml" ]; then
  echo "ERROR: docker-compose.yml not found"
  exit 1
fi

if [ ! -f ".env" ]; then
  echo "ERROR: .env not found"
  echo "Please create .env based on .env.example"
  exit 1
fi

echo "Pulling latest app image..."
docker-compose pull app

echo "Starting database..."
docker-compose up -d db

echo "Running database migration..."
docker-compose run --rm migrate

echo "Starting application..."
docker-compose up -d app

echo "Cleaning dangling images..."
docker image prune -f

echo "Container status:"
docker-compose ps

echo "======================================"
echo "Deploy completed."
echo "Visit: ${NEXT_PUBLIC_APP_URL:-please check your .env NEXT_PUBLIC_APP_URL}"
echo "======================================"