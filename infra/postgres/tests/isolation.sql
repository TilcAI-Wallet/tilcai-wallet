-- Run only against an isolated disposable database as its superuser.
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('wallet_api','wallet_worker') AND (rolsuper OR rolbypassrls OR rolcanlogin OR rolcreatedb OR rolcreaterole)) THEN
    RAISE EXCEPTION 'runtime role has unsafe attributes';
  END IF;
  IF has_table_privilege('wallet_api', 'wallet_private.credentials', 'SELECT') OR
     has_table_privilege('wallet_worker', 'wallet_private.credentials', 'SELECT') THEN
    RAISE EXCEPTION 'runtime role can read credentials directly';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace JOIN pg_roles r ON r.oid = c.relowner
             WHERE n.nspname = 'wallet_private' AND r.rolname IN ('wallet_api', 'wallet_worker')) THEN
    RAISE EXCEPTION 'runtime role owns a table';
  END IF;
END $$;
-- Temporary INSERT grant isolates the RLS write test from privilege-denial tests.
GRANT INSERT ON wallet_private.sessions TO wallet_api;
INSERT INTO wallet_private.tenants (tenant_id) VALUES ('test-tenant-a'), ('test-tenant-b');
INSERT INTO wallet_private.sessions (tenant_id, network, session_id, actor_id, expires_at)
VALUES ('test-tenant-a', 'testnet', 'test-session-a', 'actor-a', now() + interval '1 hour'),
       ('test-tenant-b', 'testnet', 'test-session-b', 'actor-b', now() + interval '1 hour');
INSERT INTO wallet_private.credentials (tenant_id,network,session_id,token_hash,scopes,expires_at)
VALUES ('test-tenant-a','testnet','test-session-a',decode(repeat('01',32),'hex'),ARRAY['orders:read'],now() + interval '1 hour'),
       ('test-tenant-b','testnet','test-session-b',decode(repeat('02',32),'hex'),ARRAY['cards:read'],now() - interval '1 hour');
INSERT INTO wallet_private.cards (tenant_id, network, card_id, session_id, contract_id, asset_id, recipient, agent)
VALUES ('test-tenant-a','testnet','card-a','test-session-a','contract-a','asset-a','recipient-a','agent-a');
INSERT INTO wallet_private.orders (tenant_id, network, order_id, card_id, session_id, offer_id, amount, payment_state, delivery_state, refund_state)
VALUES ('test-tenant-a','testnet','order-a','card-a','test-session-a','offer-a',5000000,'pending','pending','none');
INSERT INTO wallet_private.attempts (tenant_id, network, order_id, attempt_id, state)
VALUES ('test-tenant-a','testnet','order-a','attempt-a','created');
DO $$ BEGIN
  BEGIN
    INSERT INTO wallet_private.attempts (tenant_id, network, order_id, attempt_id, state)
    VALUES ('test-tenant-a','testnet','order-a','attempt-b','created');
    RAISE EXCEPTION 'second active attempt was accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO wallet_private.cards (tenant_id, network, card_id, session_id, contract_id, asset_id, recipient, agent)
    VALUES ('test-tenant-a','testnet','cross-card','test-session-b','contract','asset','recipient','agent');
    RAISE EXCEPTION 'cross-tenant foreign key was accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
END $$;
SET LOCAL ROLE wallet_api;
DO $$ BEGIN
  IF (SELECT count(*) FROM wallet_private.verify_credential(decode(repeat('01',32),'hex'))) <> 1 THEN
    RAISE EXCEPTION 'valid credential rejected';
  END IF;
  IF (SELECT count(*) FROM wallet_private.verify_credential(decode(repeat('02',32),'hex'))) <> 0 THEN
    RAISE EXCEPTION 'expired credential accepted';
  END IF;
  IF (SELECT count(*) FROM wallet_private.verify_credential(decode(repeat('03',32),'hex'))) <> 0 THEN
    RAISE EXCEPTION 'invalid credential accepted';
  END IF;
  PERFORM set_config('wallet.tenant_id', '', true);
END $$;
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

-- The prior transaction rolled back both tenant context and its fixture data.
SET ROLE wallet_api;
DO $$ BEGIN
  IF nullif(current_setting('wallet.tenant_id', true), '') IS NOT NULL THEN
    RAISE EXCEPTION 'tenant context leaked across transactions';
  END IF;
  IF EXISTS (SELECT 1 FROM wallet_private.sessions) THEN
    RAISE EXCEPTION 'session rows visible after rollback';
  END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM wallet_private.sessions WHERE tenant_id IN ('test-tenant-a', 'test-tenant-b')) THEN
    RAISE EXCEPTION 'test fixture was not rolled back';
  END IF;
END $$;
