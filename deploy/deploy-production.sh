#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
COMPOSE=(docker compose --env-file .env.production -f docker-compose.production.yml)

cd "$APP_DIR"

if [[ ! -f .env.production ]]; then
  echo "Missing $APP_DIR/.env.production" >&2
  exit 1
fi

"${COMPOSE[@]}" up -d --build --remove-orphans
"${COMPOSE[@]}" ps

for attempt in {1..12}; do
  if curl --fail --silent --show-error http://127.0.0.1:8080/healthz >/dev/null; then
    echo "Production deployment is healthy."
    exit 0
  fi
  sleep 5
done

echo "Production health check failed." >&2
"${COMPOSE[@]}" logs --tail=100 backend web migrate >&2 || true
exit 1
