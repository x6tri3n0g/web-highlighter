#!/usr/bin/env bash
# Supabase 를 흉내 낸 Postgres 에 마이그레이션을 적용하고 RLS 정책을 검증한다.
set -euo pipefail

CONTAINER="web-highlighter-db-test"
IMAGE="postgres:17-alpine"
PASSWORD="test"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cleanup() {
  docker rm -f "$CONTAINER" > /dev/null 2>&1 || true
}
trap cleanup EXIT

cleanup
echo "Postgres 를 띄웁니다."
docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD="$PASSWORD" "$IMAGE" > /dev/null

echo "준비될 때까지 기다립니다."
for _ in $(seq 1 30); do
  if docker exec "$CONTAINER" pg_isready -U postgres > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

run_sql() {
  docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 -q -U postgres -d postgres < "$1"
}

echo "Supabase 환경을 재현합니다."
run_sql "$HERE/bootstrap.sql"

echo "마이그레이션을 적용합니다."
for migration in "$HERE"/../migrations/*.sql; do
  echo "  $(basename "$migration")"
  run_sql "$migration"
done

echo
echo "RLS 정책을 검증합니다."
docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 -q -U postgres -d postgres < "$HERE/rls.sql" 2>&1 |
  grep -v '^NOTICE:  *$' |
  sed 's/^NOTICE:  //'
