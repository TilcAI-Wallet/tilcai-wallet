-- No tokens, passwords, or reusable signatures are stored in this migration.
ALTER TABLE wallet_private.sessions ADD COLUMN agent_name text NOT NULL DEFAULT 'Agent';
ALTER TABLE wallet_private.sessions ADD COLUMN display_name text NOT NULL DEFAULT 'Session';
ALTER TABLE wallet_private.cards ADD COLUMN display_name text NOT NULL DEFAULT 'Card';
ALTER TABLE wallet_private.cards ADD COLUMN mode text CHECK (mode = 'fixture');
ALTER TABLE wallet_private.cards ADD COLUMN balance_minor numeric CHECK (balance_minor >= 0 AND balance_minor = trunc(balance_minor));
ALTER TABLE wallet_private.cards ADD COLUMN payment_limit_minor numeric CHECK (payment_limit_minor >= 0 AND payment_limit_minor = trunc(payment_limit_minor));
ALTER TABLE wallet_private.cards ADD COLUMN total_limit_minor numeric CHECK (total_limit_minor >= 0 AND total_limit_minor = trunc(total_limit_minor));
ALTER TABLE wallet_private.cards ADD COLUMN spent_minor numeric CHECK (spent_minor >= 0 AND spent_minor = trunc(spent_minor));
-- Only the non-login function owner may search hashes; API role cannot read credentials.
CREATE POLICY credential_lookup ON wallet_private.credentials FOR SELECT TO wallet_migrator USING (true);
CREATE FUNCTION wallet_private.verify_credential(p_hash bytea)
RETURNS TABLE (tenant_id text, network text, session_id text, actor_id text, scopes text[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, wallet_private AS $$
DECLARE c wallet_private.credentials%ROWTYPE;
BEGIN
  IF octet_length(p_hash) <> 32 THEN RETURN; END IF;
  SELECT * INTO c FROM wallet_private.credentials cr
   WHERE cr.token_hash = p_hash AND cr.revoked_at IS NULL AND cr.expires_at > now();
  IF NOT FOUND THEN RETURN; END IF;
  PERFORM set_config('wallet.tenant_id', c.tenant_id, true);
  RETURN QUERY SELECT s.tenant_id, s.network, s.session_id, s.actor_id, c.scopes
    FROM wallet_private.sessions s
   WHERE s.tenant_id = c.tenant_id AND s.network = c.network AND s.session_id = c.session_id
     AND s.revoked_at IS NULL AND s.expires_at > now();
END $$;
REVOKE ALL ON FUNCTION wallet_private.verify_credential(bytea) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wallet_private.verify_credential(bytea) TO wallet_api;
CREATE FUNCTION wallet_private.lock_card(p_network text, p_card text, p_session text)
RETURNS SETOF wallet_private.cards LANGUAGE sql SECURITY DEFINER
SET search_path = pg_catalog, wallet_private AS $$
  SELECT * FROM wallet_private.cards c
   WHERE c.tenant_id = nullif(current_setting('wallet.tenant_id', true), '')
     AND c.network = p_network AND c.card_id = p_card AND c.session_id = p_session
   FOR UPDATE
$$;
REVOKE ALL ON FUNCTION wallet_private.lock_card(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wallet_private.lock_card(text, text, text) TO wallet_api;
GRANT INSERT ON wallet_private.receipts TO wallet_api;
-- API can initialize state but cannot insert chain or delivery evidence.
ALTER TABLE wallet_private.orders ALTER COLUMN payment_state SET DEFAULT 'pending';
ALTER TABLE wallet_private.orders ALTER COLUMN delivery_state SET DEFAULT 'pending';
ALTER TABLE wallet_private.orders ALTER COLUMN refund_state SET DEFAULT 'none';
ALTER TABLE wallet_private.attempts ALTER COLUMN state SET DEFAULT 'created';
REVOKE INSERT ON wallet_private.orders, wallet_private.attempts, wallet_private.holds, wallet_private.outbox, wallet_private.receipts FROM wallet_api;
GRANT INSERT (tenant_id,network,order_id,card_id,session_id,offer_id,amount) ON wallet_private.orders TO wallet_api;
GRANT INSERT (tenant_id,network,order_id,attempt_id) ON wallet_private.attempts TO wallet_api;
GRANT INSERT (tenant_id,network,order_id,amount) ON wallet_private.holds TO wallet_api;
GRANT INSERT (tenant_id,network,event_id,order_id,kind) ON wallet_private.outbox TO wallet_api;
GRANT INSERT (tenant_id,network,receipt_id,order_id) ON wallet_private.receipts TO wallet_api;
