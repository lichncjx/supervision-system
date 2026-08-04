#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
RELEASE_ROOT="${1:-$(dirname "$SCRIPT_DIR")}"
TAG="${2:-}"

if [ -z "$TAG" ]; then
  if [ ! -f "$RELEASE_ROOT/VERSION" ]; then
    echo "VERSION not found in: $RELEASE_ROOT" >&2
    exit 1
  fi
  IFS= read -r TAG < "$RELEASE_ROOT/VERSION"
fi

if ! printf '%s\n' "$TAG" | grep -Eq '^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$'; then
  echo "invalid Docker image tag: $TAG" >&2
  exit 1
fi

if [ ! -d "$RELEASE_ROOT/images" ]; then
  echo "images directory not found in: $RELEASE_ROOT" >&2
  exit 1
fi

if [ -f "$RELEASE_ROOT/SHA256SUMS.txt" ]; then
  (
    cd "$RELEASE_ROOT"
    sha256sum -c SHA256SUMS.txt
  )
fi

gzip -dc "$RELEASE_ROOT/images/supervision-system-app_$TAG.tar.gz" | docker load
gzip -dc "$RELEASE_ROOT/images/supervision-system-ops_$TAG.tar.gz" | docker load

if [ -f "$RELEASE_ROOT/images/postgres_16.tar.gz" ]; then
  gzip -dc "$RELEASE_ROOT/images/postgres_16.tar.gz" | docker load
fi
