#!/bin/sh
set -eu

KIND="${1:-}"
TAG="${2:-}"
PACKAGE_ROOT="${3:-}"

case "$KIND" in
  upgrade|install) ;;
  *)
    echo "usage: sh deploy/offline/scripts/export-images.sh upgrade|install <tag> <package-root>" >&2
    exit 1
    ;;
esac

if [ -z "$TAG" ] || [ -z "$PACKAGE_ROOT" ]; then
  echo "tag and package-root are required" >&2
  exit 1
fi

if ! printf '%s\n' "$TAG" | grep -Eq '^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$'; then
  echo "invalid Docker image tag: $TAG" >&2
  exit 1
fi

if [ -e "$PACKAGE_ROOT" ]; then
  echo "refusing to overwrite existing package directory: $PACKAGE_ROOT" >&2
  exit 1
fi

mkdir -p "$PACKAGE_ROOT/images" "$PACKAGE_ROOT/scripts"

save_image() {
  image="$1"
  output="$2"
  temporary="$output.tmp"

  docker image inspect "$image" >/dev/null
  trap 'rm -f "$temporary"' EXIT
  docker save -o "$temporary" "$image"
  gzip -c "$temporary" > "$output"
  rm -f "$temporary"
  trap - EXIT
}

save_image "supervision-system-app:$TAG" \
  "$PACKAGE_ROOT/images/supervision-system-app_$TAG.tar.gz"
save_image "supervision-system-ops:$TAG" \
  "$PACKAGE_ROOT/images/supervision-system-ops_$TAG.tar.gz"

if [ "$KIND" = "install" ]; then
  if ! docker image inspect postgres:16 >/dev/null 2>&1; then
    docker pull postgres:16
  fi
  save_image postgres:16 "$PACKAGE_ROOT/images/postgres_16.tar.gz"
fi

sed \
  -e "s/__OFFLINE_IMAGE_TAG__/$TAG/g" \
  deploy/offline/docker-compose.yml > "$PACKAGE_ROOT/docker-compose.yml"

printf '%s\n' "$TAG" > "$PACKAGE_ROOT/VERSION"
printf '%s\n' "$KIND" > "$PACKAGE_ROOT/RELEASE_KIND"
git rev-parse HEAD > "$PACKAGE_ROOT/SOURCE_COMMIT"

cp deploy/offline/scripts/load-images.sh "$PACKAGE_ROOT/scripts/load-images.sh"
cp deploy/offline/scripts/upgrade.sh "$PACKAGE_ROOT/scripts/upgrade.sh"
cp deploy/offline/scripts/backfill-assessment-year.sh \
  "$PACKAGE_ROOT/scripts/backfill-assessment-year.sh"
cp deploy/offline/UPGRADE.md "$PACKAGE_ROOT/UPGRADE.md"

if [ "$KIND" = "install" ]; then
  cp deploy/offline/scripts/install.sh "$PACKAGE_ROOT/scripts/install.sh"
  cp deploy/offline/.env.production.template "$PACKAGE_ROOT/.env.production.template"
  cp deploy/offline/INSTALL.md "$PACKAGE_ROOT/README.md"
  cp deploy/offline/RECOVERY.md "$PACKAGE_ROOT/RECOVERY.md"
else
  cp deploy/offline/UPGRADE.md "$PACKAGE_ROOT/README.md"
fi

(
  cd "$PACKAGE_ROOT"
  sha256sum images/*.tar.gz > SHA256SUMS.txt
)

docker image inspect --format '{{.RepoTags}} {{.Id}}' \
  "supervision-system-app:$TAG" "supervision-system-ops:$TAG" \
  > "$PACKAGE_ROOT/IMAGE_MANIFEST.txt"
if [ "$KIND" = "install" ]; then
  docker image inspect --format '{{.RepoTags}} {{.Id}}' postgres:16 \
    >> "$PACKAGE_ROOT/IMAGE_MANIFEST.txt"
fi
