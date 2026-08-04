#!/bin/sh
set -eu

MODE="${1:-}"
REQUESTED_TAG="${2:-}"
OUTPUT_ROOT="${3:-offline-release}"

case "$MODE" in
  upgrade|release) ;;
  *)
    echo "usage: sh deploy/offline/scripts/package-release.sh upgrade|release [tag] [output-root]" >&2
    exit 1
    ;;
esac

if ! command -v git >/dev/null 2>&1 || ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "package-release.sh must run from a Git worktree" >&2
  exit 1
fi

if [ -n "$(git status --porcelain --untracked-files=normal)" ]; then
  echo "working tree must be clean before packaging a release" >&2
  exit 1
fi

if [ "$MODE" = "release" ]; then
  if [ -z "$REQUESTED_TAG" ]; then
    REQUESTED_TAG="$(git tag --points-at HEAD | head -n 1)"
  fi
  if [ -z "$REQUESTED_TAG" ]; then
    echo "release mode requires a Git tag on HEAD, for example: v1.0.0" >&2
    exit 1
  fi
  case "$REQUESTED_TAG" in
    v[0-9]*) ;;
    *)
      echo "release tag must use the v* format, for example: v1.0.0" >&2
      exit 1
      ;;
  esac
  TAG_COMMIT="$(git rev-parse -q --verify "refs/tags/$REQUESTED_TAG^{commit}" 2>/dev/null || true)"
  HEAD_COMMIT="$(git rev-parse HEAD)"
  if [ "$TAG_COMMIT" != "$HEAD_COMMIT" ]; then
    echo "release tag must resolve to HEAD: $REQUESTED_TAG" >&2
    exit 1
  fi
  TAG="$REQUESTED_TAG"
else
  if [ -n "$REQUESTED_TAG" ]; then
    TAG="$REQUESTED_TAG"
  else
    COMMIT_DATE="$(git show -s --format=%cs HEAD | tr -d '-')"
    COMMIT_SHA="$(git rev-parse --short=12 HEAD)"
    TAG="$COMMIT_DATE-$COMMIT_SHA"
  fi
fi

if ! printf '%s\n' "$TAG" | grep -Eq '^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$'; then
  echo "invalid Docker image tag: $TAG" >&2
  exit 1
fi

mkdir -p "$OUTPUT_ROOT"
sh deploy/offline/scripts/build-images.sh "$TAG"

create_package() {
  kind="$1"
  name="supervision-system-${kind}_$TAG"
  package_root="$OUTPUT_ROOT/$name"
  archive="$OUTPUT_ROOT/$name.tar"

  if [ -e "$archive" ] || [ -e "$archive.sha256" ]; then
    echo "refusing to overwrite existing archive: $archive" >&2
    exit 1
  fi

  sh deploy/offline/scripts/export-images.sh "$kind" "$TAG" "$package_root"
  tar -cf "$archive" -C "$OUTPUT_ROOT" "$name"
  (
    cd "$OUTPUT_ROOT"
    sha256sum "$name.tar" > "$name.tar.sha256"
  )
  echo "Created: $archive"
}

create_package upgrade
if [ "$MODE" = "release" ]; then
  create_package install
fi
