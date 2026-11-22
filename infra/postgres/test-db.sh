#!/usr/bin/env bash
set -euo pipefail
: "${WALLET_TEST_DATABASE_URL:?Set WALLET_TEST_DATABASE_URL to an isolated disposable PostgreSQL 17 database}"
version=$(psql "$WALLET_TEST_DATABASE_URL" -XAtq -v ON_ERROR_STOP=1 -c 'SHOW server_version_num')
if [[ "$version" -lt 170000 || "$version" -ge 180000 ]]; then
  printf 'Expected PostgreSQL 17\n' >&2
  exit 1
fi
root=$(cd "$(dirname "$0")" && pwd)
psql "$WALLET_TEST_DATABASE_URL" -Xq -v ON_ERROR_STOP=1 -f "$root/migrations/001_purchase.sql"
psql "$WALLET_TEST_DATABASE_URL" -Xq -v ON_ERROR_STOP=1 -f "$root/migrations/001_purchase.sql"
psql "$WALLET_TEST_DATABASE_URL" -Xq -v ON_ERROR_STOP=1 -f "$root/tests/isolation.sql"
