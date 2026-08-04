#!/bin/sh
set -eu

if [ ! -f ".env" ]; then
  echo "ERROR: .env not found; create it from .env.example" >&2
  exit 1
fi

if [ ! -t 0 ]; then
  echo "bootstrap-admin.sh requires an interactive terminal" >&2
  exit 1
fi

restore_tty() {
  stty echo 2>/dev/null || true
}
trap restore_tty EXIT HUP INT TERM

printf '请输入 admin 一次性初始密码（至少 6 位）: '
stty -echo
IFS= read -r INITIAL_ADMIN_PASSWORD
stty echo
printf '\n请再次输入初始密码: '
stty -echo
IFS= read -r INITIAL_ADMIN_PASSWORD_CONFIRM
stty echo
printf '\n'
trap - EXIT HUP INT TERM

if [ "$INITIAL_ADMIN_PASSWORD" != "$INITIAL_ADMIN_PASSWORD_CONFIRM" ]; then
  echo "两次输入的密码不一致" >&2
  exit 1
fi

export INITIAL_ADMIN_PASSWORD
docker-compose run --no-deps --rm -e INITIAL_ADMIN_PASSWORD ops \
  ./node_modules/.bin/tsx prisma/bootstrap-admin.ts
unset INITIAL_ADMIN_PASSWORD INITIAL_ADMIN_PASSWORD_CONFIRM

echo "管理员初始化完成。请首次登录后立即修改初始密码。"
