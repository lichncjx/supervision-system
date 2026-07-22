#!/bin/sh
set -eu

TAG="${1:-}"
RELEASE_ROOT="${2:-offline-release}"

if [ -z "$TAG" ]; then
  if ! command -v git >/dev/null 2>&1; then
    echo "git is required to generate the default image tag; pass a tag explicitly" >&2
    exit 1
  fi

  if [ -n "$(git status --porcelain --untracked-files=normal)" ]; then
    echo "working tree must be clean when generating a tag from Git; commit changes or pass a tag explicitly" >&2
    exit 1
  fi

  COMMIT_DATE="$(git show -s --format=%cs HEAD | tr -d '-')"
  COMMIT_SHA="$(git rev-parse --short=12 HEAD)"
  TAG="$COMMIT_DATE-$COMMIT_SHA"
fi

if ! printf '%s\n' "$TAG" | grep -Eq '^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$'; then
  echo "invalid Docker image tag: $TAG" >&2
  exit 1
fi

docker build --target app -t "supervision-system-app:$TAG" .
docker build --target migrate -t "supervision-system-migrate:$TAG" .
docker build --target seed -t "supervision-system-seed:$TAG" .

mkdir -p "$RELEASE_ROOT"
printf '%s\n' "$TAG" > "$RELEASE_ROOT/VERSION"
echo "Built offline images with tag: $TAG"
