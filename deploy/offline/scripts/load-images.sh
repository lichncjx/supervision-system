#!/bin/sh
set -eu

TAG="${1:-}"
IMAGE_DIR="${2:-/opt/supervision-system/images}"
RELEASE_ROOT="$(dirname "${IMAGE_DIR%/}")"
VERSION_FILE="$RELEASE_ROOT/VERSION"

if [ -z "$TAG" ]; then
  if [ ! -f "$VERSION_FILE" ]; then
    echo "version file not found: $VERSION_FILE; pass a tag explicitly" >&2
    exit 1
  fi
  IFS= read -r TAG < "$VERSION_FILE"
fi

if ! printf '%s\n' "$TAG" | grep -Eq '^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$'; then
  echo "invalid Docker image tag: $TAG" >&2
  exit 1
fi

cd "$IMAGE_DIR"

gzip -dc "supervision-system-app_$TAG.tar.gz" | docker load
gzip -dc "supervision-system-migrate_$TAG.tar.gz" | docker load
gzip -dc "supervision-system-seed_$TAG.tar.gz" | docker load
gzip -dc postgres_16.tar.gz | docker load
