#!/bin/sh
set -e

COMPOSE_FILE="docker-compose-synology.yml"

echo "======================================"
echo "Deploying supervision system..."
echo "Compose file: ${COMPOSE_FILE}"
echo "======================================"

if [ ! -f "${COMPOSE_FILE}" ]; then
  echo "ERROR: ${COMPOSE_FILE} not found"
  exit 1
fi

if [ ! -f ".env" ]; then
  echo "ERROR: .env not found"
  echo "Please create .env based on .env.example"
  exit 1
fi

echo "Pulling latest images..."
docker compose -f "${COMPOSE_FILE}" pull

echo "Starting database..."
docker compose -f "${COMPOSE_FILE}" up -d db

echo "Running database migration..."
docker compose -f "${COMPOSE_FILE}" run --rm migrate

echo "Starting application..."
docker compose -f "${COMPOSE_FILE}" up -d app

echo "Cleaning dangling images..."
docker image prune -f

echo "Container status:"
docker compose -f "${COMPOSE_FILE}" ps

echo "======================================"
echo "Deploy completed."
echo "Visit: ${NEXT_PUBLIC_APP_URL:-please check your .env NEXT_PUBLIC_APP_URL}"
echo "======================================"