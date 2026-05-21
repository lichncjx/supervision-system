#!/bin/sh
set -eu

TAG="${1:-20260521}"
IMAGE_DIR="${2:-/opt/supervision-system/images}"

cd "$IMAGE_DIR"

gzip -dc "supervision-system-app_$TAG.tar.gz" | docker load
gzip -dc "supervision-system-migrate_$TAG.tar.gz" | docker load
gzip -dc "supervision-system-seed_$TAG.tar.gz" | docker load
gzip -dc postgres_16.tar.gz | docker load
