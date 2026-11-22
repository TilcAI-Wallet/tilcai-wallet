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
  -- Evidence is written only by fenced SECURITY DEFINER transitions, never by runtime DML.
  IF has_table_privilege('wallet_api','wallet_private.payment_evidence','INSERT,UPDATE,DELETE') OR
     has_table_privilege('wallet_api','wallet_private.delivery_evidence','INSERT,UPDATE,DELETE') OR
     has_table_privilege('wallet_worker','wallet_private.payment_evidence','SELECT,INSERT,UPDATE,DELETE') OR
     has_table_privilege('wallet_worker','wallet_private.delivery_evidence','SELECT,INSERT,UPDATE,DELETE') OR
     has_table_privilege('wallet_api','wallet_private.orders','UPDATE') OR
     has_table_privilege('wallet_api','wallet_private.attempts','UPDATE') OR
     has_table_privilege('wallet_api','wallet_private.cards','UPDATE') THEN
    RAISE EXCEPTION 'runtime role can alter financial evidence or state directly';
  END IF;
  IF has_function_privilege('wallet_api','wallet_private.confirm_testnet_payment(text,text,text,text,text,text,bigint,integer,text,text,text,numeric,bytea)','EXECUTE') OR
     has_function_privilege('wallet_api','wallet_private.record_demo_delivery(text,text,text,text,text,text,integer,text)','EXECUTE') OR
     has_function_privilege('wallet_api','wallet_private.claim_testnet(integer)','EXECUTE') THEN
    RAISE EXCEPTION 'API role can execute worker transitions';
  END IF;
  -- Every SECURITY DEFINER function pins search_path and is not executable by PUBLIC.
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='wallet_private' AND p.prosecdef
               AND (p.proconfig IS NULL OR NOT EXISTS (SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%')
                    OR p.proacl IS NULL OR EXISTS (SELECT 1 FROM aclexplode(p.proacl) a WHERE a.grantee = 0))) THEN
    RAISE EXCEPTION 'unsafe SECURITY DEFINER function';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='wallet_private' AND tablename='outbox' AND policyname='api_payment_events_only' AND permissive='RESTRICTIVE') THEN
    RAISE EXCEPTION 'API outbox restriction missing';
  END IF;
  -- The API tenant must come from a credential verified in the same transaction.
  IF has_table_privilege('wallet_api','wallet_private.api_context','SELECT,INSERT,UPDATE,DELETE') OR
     has_table_privilege('wallet_worker','wallet_private.api_context','SELECT,INSERT,UPDATE,DELETE') THEN
    RAISE EXCEPTION 'runtime role can forge API context';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies t WHERE t.schemaname='wallet_private' AND t.policyname='tenant_scope'
             AND NOT EXISTS (SELECT 1 FROM pg_policies r WHERE r.schemaname=t.schemaname AND r.tablename=t.tablename
                             AND r.policyname='api_credential_scope' AND r.permissive='RESTRICTIVE' AND r.roles='{wallet_api}')) THEN
    RAISE EXCEPTION 'tenant table without credential-bound API policy';
  END IF;
  -- WalletFoundation v2: the v1 spend(amount) envelope storage entry point no longer exists.
  IF to_regprocedure('wallet_private.store_testnet_envelope(text,text,text,text,text,text,text,text,bigint,text,bytea,bytea,bytea,bytea)') IS NOT NULL OR
     NOT has_function_privilege('wallet_worker','wallet_private.store_testnet_envelope(text,text,text,text,text,text,text,text,bigint,text,bytea,bytea,bytea,bytea,bigint)','EXECUTE') OR
     has_function_privilege('wallet_api','wallet_private.store_testnet_envelope(text,text,text,text,text,text,text,text,bigint,text,bytea,bytea,bytea,bytea,bigint)','EXECUTE') THEN
    RAISE EXCEPTION 'unexpected Testnet envelope storage interface';
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
       ('test-tenant-b','testnet','test-session-b',decode(repeat('02',32),'hex'),ARRAY['cards:read'],now() - interval '1 hour'),
       ('test-tenant-b','testnet','test-session-b',decode(repeat('04',32),'hex'),ARRAY['cards:read'],now() + interval '1 hour');
INSERT INTO wallet_private.cards (tenant_id, network, card_id, session_id, contract_id, asset_id, recipient, agent)
VALUES ('test-tenant-a','testnet','card-a','test-session-a','contract-a','asset-a','recipient-a','agent-a'),
       ('test-tenant-b','testnet','card-b','test-session-b','contract-b','asset-b','recipient-b','agent-b');
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
-- Spoofing the GUC without a verified credential exposes nothing, including through lock_card.
SELECT set_config('wallet.tenant_id', 'test-tenant-a', true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM wallet_private.sessions) OR EXISTS (SELECT 1 FROM wallet_private.cards) OR
     EXISTS (SELECT 1 FROM wallet_private.lock_card('testnet','card-a','test-session-a')) THEN
    RAISE EXCEPTION 'spoofed tenant context without credential leaked rows';
  END IF;
  BEGIN
    INSERT INTO wallet_private.sessions (tenant_id, network, session_id, actor_id, expires_at)
      VALUES ('test-tenant-a', 'testnet', 'spoofed', 'actor-a', now() + interval '1 hour');
    RAISE EXCEPTION 'spoofed tenant write succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  PERFORM set_config('wallet.tenant_id', '', true);
END $$;
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
-- Bound to tenant A: switching the GUC to B or verifying a B credential cannot reach B.
SELECT set_config('wallet.tenant_id', 'test-tenant-b', true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM wallet_private.sessions) OR EXISTS (SELECT 1 FROM wallet_private.cards) OR
     EXISTS (SELECT 1 FROM wallet_private.lock_card('testnet','card-b','test-session-b')) THEN
    RAISE EXCEPTION 'GUC switch reached another tenant';
  END IF;
  BEGIN
    PERFORM * FROM wallet_private.verify_credential(decode(repeat('04',32),'hex'));
    RAISE EXCEPTION 'second tenant bound in one transaction';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'transaction already bound to another tenant' THEN RAISE; END IF;
  END;
  IF wallet_private.api_tenant() IS DISTINCT FROM 'test-tenant-a' THEN RAISE EXCEPTION 'binding changed'; END IF;
END $$;
SELECT set_config('wallet.tenant_id', 'test-tenant-a', true);
DO $$ BEGIN
  IF (SELECT count(*) FROM wallet_private.lock_card('testnet','card-a','test-session-a')) <> 1 THEN
    RAISE EXCEPTION 'bound credential cannot lock its own card';
  END IF;
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
