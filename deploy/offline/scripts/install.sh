#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
RELEASE_ROOT="${1:-$(dirname "$SCRIPT_DIR")}"

if [ ! -f "$RELEASE_ROOT/docker-compose.yml" ]; then
  echo "docker-compose.yml not found in: $RELEASE_ROOT" >&2
  exit 1
fi

if [ ! -f "$RELEASE_ROOT/.env.production" ]; then
  echo ".env.production not found; copy .env.production.template and fill all required values" >&2
  exit 1
fi

if docker inspect supervision-app >/dev/null 2>&1; then
  echo "supervision-app already exists; use upgrade.sh or follow RECOVERY.md" >&2
  exit 1
fi

if grep -Eq '=(|.*请修改.*|.*change-me.*|your-.*|.*服务器内网IP.*)$' "$RELEASE_ROOT/.env.production"; then
  echo ".env.production still contains an empty value or template placeholder" >&2
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  compose() { docker compose "$@"; }
elif command -v docker-compose >/dev/null 2>&1; then
  compose() { docker-compose "$@"; }
else
  echo "docker compose or docker-compose is required" >&2
  exit 1
fi

read_admin_password() {
  if [ -n "${INITIAL_ADMIN_PASSWORD:-}" ]; then
    ADMIN_PASSWORD="$INITIAL_ADMIN_PASSWORD"
    return
  fi

  if [ ! -t 0 ]; then
    echo "interactive terminal is required, or pass INITIAL_ADMIN_PASSWORD to install.sh" >&2
    exit 1
  fi

  restore_tty() {
    stty echo 2>/dev/null || true
  }
  trap restore_tty EXIT HUP INT TERM

  printf '请输入 admin 一次性初始密码（至少 6 位）: '
  stty -echo
  IFS= read -r ADMIN_PASSWORD
  stty echo
  printf '\n请再次输入初始密码: '
  stty -echo
  IFS= read -r ADMIN_PASSWORD_CONFIRM
  stty echo
  printf '\n'
  trap - EXIT HUP INT TERM

  if [ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD_CONFIRM" ]; then
    echo "两次输入的密码不一致" >&2
    exit 1
  fi
}

mkdir -p "$RELEASE_ROOT/data/postgres" "$RELEASE_ROOT/uploads" "$RELEASE_ROOT/backup"
sh "$RELEASE_ROOT/scripts/load-images.sh" "$RELEASE_ROOT"

cd "$RELEASE_ROOT"
compose up -d db
compose run --rm ops

read_admin_password
INITIAL_ADMIN_PASSWORD="$ADMIN_PASSWORD"
export INITIAL_ADMIN_PASSWORD
compose run --no-deps --rm -e INITIAL_ADMIN_PASSWORD ops \
  ./node_modules/.bin/tsx prisma/bootstrap-admin.ts
unset INITIAL_ADMIN_PASSWORD ADMIN_PASSWORD ADMIN_PASSWORD_CONFIRM

compose up -d --no-deps app
compose ps

echo "首次安装完成。请使用 admin 登录并立即修改初始密码。"
