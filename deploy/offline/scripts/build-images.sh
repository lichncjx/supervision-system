#!/bin/sh
set -eu

TAG="${1:-20260521}"

docker build --target app -t "supervision-system-app:$TAG" .
docker build --target migrate -t "supervision-system-migrate:$TAG" .
docker build --target seed -t "supervision-system-seed:$TAG" .
