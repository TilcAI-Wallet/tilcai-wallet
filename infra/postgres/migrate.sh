#!/usr/bin/env bash
set -euo pipefail
: "${WALLET_MIGRATION_DATABASE_URL:?Set WALLET_MIGRATION_DATABASE_URL explicitly}"
root=$(cd "$(dirname "$0")" && pwd)
script=$(mktemp)
trap 'rm -f "$script"' EXIT
cat > "$script" <<'SQL'
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL ROLE wallet_migrator;
SELECT pg_advisory_xact_lock(671133001);
CREATE SCHEMA IF NOT EXISTS wallet_private;
REVOKE ALL ON SCHEMA wallet_private FROM PUBLIC;
CREATE TABLE IF NOT EXISTS wallet_private.schema_migrations (version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now());
REVOKE ALL ON wallet_private.schema_migrations FROM PUBLIC;
SQL
for file in "$root"/migrations/[0-9][0-9][0-9]_*.sql; do
  version=${file##*/}
  checksum=$(sha256sum "$file" | cut -d ' ' -f 1)
  # The tracked path and filenames must be safe to embed in psql's \ir command.
  if [[ "$file" == *"'"* || ! "$version" =~ ^[0-9]{3}_[a-z0-9_]+\.sql$ ]]; then
    printf 'Unsafe migration path or filename\n' >&2; exit 1
  fi
  cat >> "$script" <<SQL
DO \$\$ BEGIN
  IF EXISTS (SELECT 1 FROM wallet_private.schema_migrations WHERE version = '$version' AND checksum <> '$checksum') THEN
    RAISE EXCEPTION 'Migration checksum mismatch: $version';
  END IF;
END \$\$;
SELECT NOT EXISTS (SELECT 1 FROM wallet_private.schema_migrations WHERE version = '$version') AS apply_migration \gset
\if :apply_migration
\i '$file'
INSERT INTO wallet_private.schema_migrations(version, checksum) VALUES ('$version', '$checksum');
\endif
SQL
done
printf 'COMMIT;\n' >> "$script"
psql "$WALLET_MIGRATION_DATABASE_URL" -Xq -v ON_ERROR_STOP=1 -f "$script"
