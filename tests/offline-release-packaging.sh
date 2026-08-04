#!/bin/sh
set -eu

TEST_ROOT="$(mktemp -d /tmp/supervision-offline-release-test.XXXXXX)"
trap 'rm -rf "$TEST_ROOT"' EXIT HUP INT TERM

REPO="$TEST_ROOT/repo"
FAKE_BIN="$TEST_ROOT/bin"
mkdir -p "$REPO/deploy/offline/scripts" "$FAKE_BIN"

cp .gitignore Dockerfile "$REPO/"
cp deploy/offline/docker-compose.yml deploy/offline/.env.production.template \
  deploy/offline/INSTALL.md deploy/offline/UPGRADE.md deploy/offline/RECOVERY.md \
  "$REPO/deploy/offline/"
cp deploy/offline/scripts/build-images.sh deploy/offline/scripts/export-images.sh \
  deploy/offline/scripts/package-release.sh deploy/offline/scripts/load-images.sh \
  deploy/offline/scripts/install.sh deploy/offline/scripts/upgrade.sh \
  deploy/offline/scripts/backfill-assessment-year.sh \
  "$REPO/deploy/offline/scripts/"

cat > "$FAKE_BIN/docker" <<'EOF'
#!/bin/sh
set -eu

case "${1:-}" in
  build|pull|load)
    exit 0
    ;;
  image)
    if [ "${2:-}" = "inspect" ]; then
      if [ "${3:-}" = "--format" ]; then
        shift 4
        for image in "$@"; do
          printf '[%s] sha256:fake\n' "$image"
        done
      fi
      exit 0
    fi
    ;;
  save)
    shift
    output=''
    if [ "${1:-}" = "-o" ]; then
      output="$2"
      shift 2
    fi
    printf 'fake image: %s\n' "${1:-unknown}" > "$output"
    exit 0
    ;;
esac

echo "unsupported fake docker command: $*" >&2
exit 1
EOF
chmod +x "$FAKE_BIN/docker"

cd "$REPO"
git init -q
git config user.name 'Offline Release Test'
git config user.email 'offline-release@example.invalid'
git add .
git commit -qm 'test fixture'

PATH="$FAKE_BIN:$PATH" sh deploy/offline/scripts/package-release.sh upgrade
UPGRADE_ARCHIVE="$(find offline-release -maxdepth 1 -name 'supervision-system-upgrade_*.tar' | head -n 1)"
test -n "$UPGRADE_ARCHIVE"
if find offline-release -maxdepth 1 -name 'supervision-system-install_*.tar' | grep -q .; then
  echo 'upgrade mode unexpectedly created an install archive' >&2
  exit 1
fi
(
  cd offline-release
  sha256sum -c "$(basename "$UPGRADE_ARCHIVE").sha256"
)

if PATH="$FAKE_BIN:$PATH" sh deploy/offline/scripts/package-release.sh release v1.0.0 >/dev/null 2>&1; then
  echo 'release mode unexpectedly accepted a missing Git tag' >&2
  exit 1
fi

git tag -a v1.0.0 -m v1.0.0
PATH="$FAKE_BIN:$PATH" sh deploy/offline/scripts/package-release.sh release v1.0.0
test -f offline-release/supervision-system-upgrade_v1.0.0.tar
test -f offline-release/supervision-system-install_v1.0.0.tar
test -f offline-release/supervision-system-upgrade_v1.0.0.tar.sha256
test -f offline-release/supervision-system-install_v1.0.0.tar.sha256

tar -tf offline-release/supervision-system-upgrade_v1.0.0.tar \
  | grep -q 'supervision-system-upgrade_v1.0.0/images/supervision-system-ops_v1.0.0.tar.gz'
if tar -tf offline-release/supervision-system-upgrade_v1.0.0.tar \
  | grep -qE '(postgres_16|\.env\.production\.template|scripts/install\.sh)'; then
  echo 'upgrade archive contains install-only assets' >&2
  exit 1
fi

tar -tf offline-release/supervision-system-install_v1.0.0.tar \
  | grep -q 'supervision-system-install_v1.0.0/images/postgres_16.tar.gz'
tar -tf offline-release/supervision-system-install_v1.0.0.tar \
  | grep -q 'supervision-system-install_v1.0.0/.env.production.template'
tar -tf offline-release/supervision-system-install_v1.0.0.tar \
  | grep -q 'supervision-system-install_v1.0.0/scripts/install.sh'

echo 'offline release packaging regression passed'
