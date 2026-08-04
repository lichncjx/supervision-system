#!/bin/sh
set -eu

TAG="${1:-}"

if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if [ -n "$(git status --porcelain --untracked-files=normal)" ]; then
    echo "working tree must be clean before building release images" >&2
    exit 1
  fi

  if [ -z "$TAG" ]; then
    COMMIT_DATE="$(git show -s --format=%cs HEAD | tr -d '-')"
    COMMIT_SHA="$(git rev-parse --short=12 HEAD)"
    TAG="$COMMIT_DATE-$COMMIT_SHA"
  fi
elif [ -z "$TAG" ]; then
  echo "git metadata is unavailable; pass an explicit image tag" >&2
  exit 1
fi

if ! printf '%s\n' "$TAG" | grep -Eq '^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$'; then
  echo "invalid Docker image tag: $TAG" >&2
  exit 1
fi

docker build --target app -t "supervision-system-app:$TAG" .
docker build --target ops -t "supervision-system-ops:$TAG" .

echo "Built app and ops images with tag: $TAG"
