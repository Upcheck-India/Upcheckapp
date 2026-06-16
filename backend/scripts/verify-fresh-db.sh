#!/usr/bin/env bash
# =============================================================================
# Fresh-DB migration gate  (migration-safety invariant #2)
#
# Proves the FULL TypeORM migration chain + the Supabase auth trigger apply
# cleanly to an EMPTY Postgres, and that the trigger actually mirrors
# auth.users -> public.users. This is the core protection for the fresh
# Supabase cutover: if this passes, provisioning a brand-new project is a
# non-event. Re-run it after every stage that touches schema.
#
# Requires: Docker. No local Postgres/psql needed (uses the container's psql).
# Usage:    bash scripts/verify-fresh-db.sh
# =============================================================================
set -euo pipefail

CONTAINER="upcheck-migrate-check"
PORT="${VERIFY_PGPORT:-55432}"
PASS="upcheckverify"
PG_IMAGE="${VERIFY_PG_IMAGE:-postgres:15}"
EXPECTED_MIN_TABLES="${EXPECTED_MIN_TABLES:-33}"
BACKEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "$BACKEND_DIR/.." && pwd)"
TRIGGER_SQL="$REPO_ROOT/supabase_setup.sql"

psql_db() { docker exec -i "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 "$@"; }
cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT

command -v docker >/dev/null 2>&1 || { echo "ERROR: docker is required"; exit 2; }

cleanup
echo "==> [1/6] starting throwaway $PG_IMAGE as '$CONTAINER' on :$PORT"
docker run -d --name "$CONTAINER" \
  -e POSTGRES_PASSWORD="$PASS" -e POSTGRES_DB=postgres \
  -p "$PORT:5432" "$PG_IMAGE" >/dev/null

echo "==> [2/6] waiting for postgres readiness"
for _ in $(seq 1 60); do
  docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1 && break
  sleep 1
done
docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1 || { echo "FAIL: postgres never became ready"; exit 1; }
# pgcrypto: parity with Supabase (gen_random_uuid etc.)
psql_db -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto;' >/dev/null

echo "==> [3/6] running TypeORM migration chain against the EMPTY database"
export DATABASE_URL="postgres://postgres:${PASS}@127.0.0.1:${PORT}/postgres"
export PGSSL=disable
( cd "$BACKEND_DIR" && npm run migration:run )

echo "==> [4/6] asserting schema (tables + disease seed)"
TABLE_COUNT=$(docker exec "$CONTAINER" psql -U postgres -d postgres -tAc \
  "select count(*) from information_schema.tables where table_schema='public';")
TABLE_COUNT=$(echo "$TABLE_COUNT" | tr -d '[:space:]')
echo "    public tables: $TABLE_COUNT (expected >= $EXPECTED_MIN_TABLES)"
[ "$TABLE_COUNT" -ge "$EXPECTED_MIN_TABLES" ] || { echo "FAIL: too few tables created"; exit 1; }

DISEASE=$(docker exec "$CONTAINER" psql -U postgres -d postgres -tAc \
  "select count(*) from disease_library;" 2>/dev/null | tr -d '[:space:]' || echo 0)
echo "    disease_library rows: $DISEASE (expected >= 1)"
[ "${DISEASE:-0}" -ge 1 ] || { echo "FAIL: disease library not seeded"; exit 1; }

echo "==> [5/6] applying Supabase auth trigger against a stub auth.users"
# Bare Postgres has no Supabase-managed auth schema; stub the columns the
# trigger reads so supabase_setup.sql applies exactly as it will on Supabase.
psql_db >/dev/null <<'SQL'
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email              text,
  raw_app_meta_data  jsonb DEFAULT '{}'::jsonb,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  email_confirmed_at timestamptz,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);
SQL
psql_db < "$TRIGGER_SQL" >/dev/null

echo "==> [6/6] proving the trigger mirrors auth.users -> public.users"
# This is the exact failure that broke prior relinks (orphaned auth users).
psql_db >/dev/null <<'SQL'
INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, email_confirmed_at)
VALUES (
  '00000000-0000-0000-0000-000000000abc',
  'gatecheck@upcheck.test',
  '{"provider":"email"}'::jsonb,
  '{"firstName":"Gate","lastName":"Check"}'::jsonb,
  now()
);
SQL
MIRRORED=$(docker exec "$CONTAINER" psql -U postgres -d postgres -tAc \
  "select count(*) from public.users where id='00000000-0000-0000-0000-000000000abc';" | tr -d '[:space:]')
echo "    mirrored public.users rows: $MIRRORED (expected 1)"
[ "$MIRRORED" = "1" ] || { echo "FAIL: auth trigger did not create the public.users row"; exit 1; }

echo ""
echo "PASS: full migration chain + auth trigger apply cleanly to an empty database,"
echo "      and the auth.users -> public.users sync works. Fresh-Supabase cutover is safe."
