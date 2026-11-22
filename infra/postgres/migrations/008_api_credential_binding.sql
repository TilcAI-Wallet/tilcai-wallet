-- The API role could previously choose any tenant with set_config('wallet.tenant_id', ...).
-- The tenant visible to wallet_api is now bound to a credential verified in the same transaction.
CREATE TABLE wallet_private.api_context (
  backend_pid integer NOT NULL, xact xid8 NOT NULL,
  tenant_id text NOT NULL, network text NOT NULL, session_id text NOT NULL,
  PRIMARY KEY (backend_pid, xact)
);
REVOKE ALL ON wallet_private.api_context FROM PUBLIC, wallet_api, wallet_worker;

-- Tenant bound by verify_credential in the current transaction, or NULL.
CREATE FUNCTION wallet_private.api_tenant() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, wallet_private AS $$
  SELECT x.tenant_id FROM wallet_private.api_context x
   WHERE x.backend_pid = pg_backend_pid() AND x.xact = pg_current_xact_id_if_assigned()
$$;
REVOKE ALL ON FUNCTION wallet_private.api_tenant() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wallet_private.api_tenant() TO wallet_api;

-- Context is set only for a live credential and a live session; one credential identity per transaction.
CREATE OR REPLACE FUNCTION wallet_private.verify_credential(p_hash bytea)
RETURNS TABLE (tenant_id text, network text, session_id text, actor_id text, scopes text[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, wallet_private AS $$
DECLARE c wallet_private.credentials%ROWTYPE; s wallet_private.sessions%ROWTYPE; bound wallet_private.api_context%ROWTYPE;
BEGIN
  IF p_hash IS NULL OR octet_length(p_hash) <> 32 THEN RETURN; END IF;
  SELECT * INTO c FROM wallet_private.credentials cr
   WHERE cr.token_hash = p_hash AND cr.revoked_at IS NULL AND cr.expires_at > now();
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO bound FROM wallet_private.api_context x WHERE x.backend_pid = pg_backend_pid() AND x.xact = pg_current_xact_id();
  IF FOUND AND bound.tenant_id IS DISTINCT FROM c.tenant_id THEN RAISE EXCEPTION 'transaction already bound to another tenant'; END IF;
  -- Sessions are tenant scoped (FORCE RLS), so the context is needed to read them.
  PERFORM set_config('wallet.tenant_id', c.tenant_id, true);
  SELECT * INTO s FROM wallet_private.sessions x
   WHERE x.tenant_id = c.tenant_id AND x.network = c.network AND x.session_id = c.session_id
     AND x.revoked_at IS NULL AND x.expires_at > now();
  IF NOT FOUND THEN
    IF bound.tenant_id IS NULL THEN PERFORM set_config('wallet.tenant_id', '', true); END IF;
    RETURN;
  END IF;
  IF bound.tenant_id IS NULL THEN
    DELETE FROM wallet_private.api_context x WHERE x.backend_pid = pg_backend_pid();
    INSERT INTO wallet_private.api_context(backend_pid, xact, tenant_id, network, session_id)
    VALUES (pg_backend_pid(), pg_current_xact_id(), s.tenant_id, s.network, s.session_id);
  ELSIF (bound.network, bound.session_id) IS DISTINCT FROM (s.network, s.session_id) THEN
    RAISE EXCEPTION 'transaction already bound to another session';
  END IF;
  RETURN QUERY SELECT s.tenant_id, s.network, s.session_id, s.actor_id, c.scopes;
END $$;

-- lock_card runs as the owner, so it must check the bound credential itself, not only the GUC.
CREATE OR REPLACE FUNCTION wallet_private.lock_card(p_network text, p_card text, p_session text)
RETURNS SETOF wallet_private.cards LANGUAGE sql SECURITY DEFINER
SET search_path = pg_catalog, wallet_private AS $$
  SELECT c.* FROM wallet_private.cards c
  JOIN wallet_private.api_context x ON x.tenant_id = c.tenant_id AND x.network = c.network AND x.session_id = c.session_id
   WHERE x.backend_pid = pg_backend_pid() AND x.xact = pg_current_xact_id_if_assigned()
     AND c.tenant_id = nullif(current_setting('wallet.tenant_id', true), '')
     AND c.network = p_network AND c.card_id = p_card AND c.session_id = p_session
   FOR UPDATE OF c
$$;

-- RESTRICTIVE: for wallet_api every tenant table also requires the credential-bound tenant.
DO $$
DECLARE relation_name name;
BEGIN
  FOR relation_name IN SELECT p.tablename FROM pg_policies p WHERE p.schemaname = 'wallet_private' AND p.policyname = 'tenant_scope' ORDER BY 1 LOOP
    EXECUTE format('CREATE POLICY api_credential_scope ON wallet_private.%I AS RESTRICTIVE TO wallet_api USING (tenant_id = (SELECT wallet_private.api_tenant())) WITH CHECK (tenant_id = (SELECT wallet_private.api_tenant()))', relation_name);
  END LOOP;
END $$;
