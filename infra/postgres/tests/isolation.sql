-- Run only against an isolated disposable database as its superuser.
BEGIN;
CREATE ROLE wallet_test_api NOLOGIN NOSUPERUSER NOBYPASSRLS;
GRANT USAGE ON SCHEMA wallet_private TO wallet_test_api;
GRANT SELECT, INSERT ON wallet_private.sessions TO wallet_test_api;
INSERT INTO wallet_private.tenants (tenant_id) VALUES ('test-tenant-a'), ('test-tenant-b');
INSERT INTO wallet_private.sessions (tenant_id, network, session_id, actor_id, expires_at)
VALUES ('test-tenant-a', 'testnet', 'test-session-a', 'actor-a', now() + interval '1 hour'),
       ('test-tenant-b', 'testnet', 'test-session-b', 'actor-b', now() + interval '1 hour');
SET LOCAL ROLE wallet_test_api;
DO $$ BEGIN
  IF (SELECT count(*) FROM wallet_private.sessions) <> 0 THEN RAISE EXCEPTION 'missing tenant context leaked rows'; END IF;
END $$;
SELECT set_config('wallet.tenant_id', 'test-tenant-a', true);
DO $$ BEGIN
  IF (SELECT count(*) FROM wallet_private.sessions) <> 1 OR EXISTS (SELECT 1 FROM wallet_private.sessions WHERE tenant_id = 'test-tenant-b') THEN
    RAISE EXCEPTION 'cross-tenant read';
  END IF;
  BEGIN
    INSERT INTO wallet_private.sessions (tenant_id, network, session_id, actor_id, expires_at)
      VALUES ('test-tenant-b', 'testnet', 'test-illegal', 'actor-b', now() + interval '1 hour');
    RAISE EXCEPTION 'cross-tenant write succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
ROLLBACK;
