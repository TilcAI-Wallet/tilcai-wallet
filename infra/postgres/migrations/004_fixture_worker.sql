-- Only explicitly assigned database login identities may discover fixture work.
CREATE TABLE wallet_private.worker_assignments (
  login_name name NOT NULL, tenant_id text NOT NULL REFERENCES wallet_private.tenants,
  PRIMARY KEY (login_name, tenant_id)
);
REVOKE ALL ON wallet_private.worker_assignments FROM PUBLIC, wallet_api, wallet_worker;
CREATE TABLE wallet_private.fixture_submissions (
  tenant_id text NOT NULL, network text NOT NULL, order_id text NOT NULL,
  tx_hash text NOT NULL CHECK (tx_hash ~ '^[0-9a-f]{64}$'),
  payload bytea NOT NULL, PRIMARY KEY (tenant_id, network, order_id),
  FOREIGN KEY (tenant_id, network, order_id) REFERENCES wallet_private.orders
);
ALTER TABLE wallet_private.fixture_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_private.fixture_submissions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON wallet_private.fixture_submissions USING (tenant_id = nullif(current_setting('wallet.tenant_id', true), '')) WITH CHECK (tenant_id = nullif(current_setting('wallet.tenant_id', true), ''));
REVOKE ALL ON wallet_private.fixture_submissions FROM PUBLIC, wallet_api, wallet_worker;
ALTER TABLE wallet_private.attempts ADD COLUMN fixture_payload bytea;
-- The worker can neither enumerate tenants nor directly alter financial tables.
REVOKE ALL ON wallet_private.orders, wallet_private.cards, wallet_private.outbox, wallet_private.attempts,
  wallet_private.inbox, wallet_private.receipts, wallet_private.cursors FROM wallet_worker;

CREATE FUNCTION wallet_private.claim_fixture(p_seconds integer)
RETURNS TABLE(tenant_id text, event_id text, order_id text, lease_token text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, wallet_private AS $$
DECLARE assignment record; claimed record; token text;
BEGIN
  IF p_seconds < 1 OR p_seconds > 300 THEN RAISE EXCEPTION 'invalid lease'; END IF;
  FOR assignment IN SELECT a.tenant_id FROM wallet_private.worker_assignments a WHERE a.login_name = session_user ORDER BY a.tenant_id LOOP
    PERFORM set_config('wallet.tenant_id', assignment.tenant_id, true);
    token := gen_random_uuid()::text;
    UPDATE wallet_private.outbox ob SET lease_token=token, lease_until=clock_timestamp()+p_seconds*interval '1 second'
     WHERE ob.tenant_id=assignment.tenant_id AND ob.network='testnet' AND ob.event_id=(
       SELECT o.event_id FROM wallet_private.outbox o
       JOIN wallet_private.orders ord USING(tenant_id,network,order_id)
       JOIN wallet_private.cards card USING(tenant_id,network,card_id)
       WHERE o.tenant_id=assignment.tenant_id AND o.network='testnet' AND o.kind='payment'
         AND o.completed_at IS NULL AND (o.lease_until IS NULL OR o.lease_until <= clock_timestamp())
         AND card.mode='fixture' AND ord.payment_state IN ('pending','uncertain')
       ORDER BY o.event_id FOR UPDATE OF o SKIP LOCKED LIMIT 1)
     RETURNING ob.tenant_id, ob.event_id, ob.order_id INTO claimed;
    IF FOUND THEN RETURN QUERY SELECT claimed.tenant_id, claimed.event_id, claimed.order_id, token; RETURN; END IF;
  END LOOP;
END $$;

-- Every mutation checks both the assigned login and an unexpired fencing token.
CREATE FUNCTION wallet_private.advance_fixture(p_tenant text, p_event text, p_token text, p_step text, p_hash text, p_payload bytea)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, wallet_private AS $$
DECLARE task wallet_private.outbox%ROWTYPE; attempt wallet_private.attempts%ROWTYPE; item wallet_private.orders%ROWTYPE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM wallet_private.worker_assignments a WHERE a.login_name=session_user AND a.tenant_id=p_tenant) THEN RETURN false; END IF;
  PERFORM set_config('wallet.tenant_id', p_tenant, true);
  SELECT * INTO task FROM wallet_private.outbox o WHERE o.tenant_id=p_tenant AND o.network='testnet' AND o.event_id=p_event AND o.lease_token=p_token AND o.lease_until>clock_timestamp() AND o.completed_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT * INTO item FROM wallet_private.orders o WHERE o.tenant_id=p_tenant AND o.network=task.network AND o.order_id=task.order_id;
  IF NOT EXISTS (SELECT 1 FROM wallet_private.cards c WHERE c.tenant_id=p_tenant AND c.network=task.network AND c.card_id=item.card_id AND c.mode='fixture') THEN RETURN false; END IF;
  SELECT * INTO attempt FROM wallet_private.attempts a WHERE a.tenant_id=p_tenant AND a.network=task.network AND a.order_id=task.order_id AND a.state IN ('created','prepared','uncertain') FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF p_step='prepare' THEN
    IF attempt.state <> 'created' OR p_hash !~ '^[0-9a-f]{64}$' OR p_payload IS NULL OR octet_length(p_payload)>1024 THEN RETURN false; END IF;
    UPDATE wallet_private.attempts SET state='prepared',tx_hash=p_hash,envelope_ref='private:fixture',valid_through_ledger=1,fixture_payload=p_payload WHERE tenant_id=p_tenant AND network=task.network AND attempt_id=attempt.attempt_id;
  ELSIF p_step='submit' THEN
    IF attempt.state NOT IN ('prepared','uncertain') OR attempt.fixture_payload IS NULL THEN RETURN false; END IF;
    INSERT INTO wallet_private.fixture_submissions (tenant_id,network,order_id,tx_hash,payload) VALUES (p_tenant,task.network,task.order_id,attempt.tx_hash,attempt.fixture_payload) ON CONFLICT DO NOTHING;
    IF NOT EXISTS (SELECT 1 FROM wallet_private.fixture_submissions s WHERE s.tenant_id=p_tenant AND s.network=task.network AND s.order_id=task.order_id AND s.tx_hash=attempt.tx_hash AND s.payload=attempt.fixture_payload) THEN RAISE EXCEPTION 'fixture discrepancy'; END IF;
    UPDATE wallet_private.attempts SET state='uncertain' WHERE tenant_id=p_tenant AND network=task.network AND attempt_id=attempt.attempt_id;
    UPDATE wallet_private.orders SET payment_state='uncertain' WHERE tenant_id=p_tenant AND network=task.network AND order_id=task.order_id;
  ELSIF p_step='confirm' THEN
    IF attempt.state <> 'uncertain' OR NOT EXISTS (SELECT 1 FROM wallet_private.fixture_submissions s WHERE s.tenant_id=p_tenant AND s.network=task.network AND s.order_id=task.order_id AND s.tx_hash=attempt.tx_hash AND s.payload=attempt.fixture_payload) THEN RETURN false; END IF;
    UPDATE wallet_private.attempts SET state='confirmed' WHERE tenant_id=p_tenant AND network=task.network AND attempt_id=attempt.attempt_id;
    UPDATE wallet_private.orders SET payment_state='confirmed' WHERE tenant_id=p_tenant AND network=task.network AND order_id=task.order_id;
    UPDATE wallet_private.receipts SET tx_hash=attempt.tx_hash,ledger=1 WHERE tenant_id=p_tenant AND network=task.network AND order_id=task.order_id;
    UPDATE wallet_private.cards SET spent_minor=spent_minor+item.amount,balance_minor=balance_minor-item.amount WHERE tenant_id=p_tenant AND network=task.network AND card_id=item.card_id AND mode='fixture' AND balance_minor>=item.amount AND spent_minor+item.amount<=total_limit_minor;
    IF NOT FOUND THEN RAISE EXCEPTION 'fixture budget changed'; END IF;
    UPDATE wallet_private.holds SET released_at=clock_timestamp() WHERE tenant_id=p_tenant AND network=task.network AND order_id=task.order_id AND released_at IS NULL;
    UPDATE wallet_private.outbox SET completed_at=clock_timestamp() WHERE tenant_id=p_tenant AND network=task.network AND event_id=p_event;
  ELSE RETURN false;
  END IF;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION wallet_private.claim_fixture(integer), wallet_private.advance_fixture(text,text,text,text,text,bytea) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wallet_private.claim_fixture(integer), wallet_private.advance_fixture(text,text,text,text,text,bytea) TO wallet_worker;
CREATE FUNCTION wallet_private.renew_fixture(p_tenant text,p_event text,p_token text,p_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, wallet_private AS $$
BEGIN
  IF p_seconds < 1 OR p_seconds > 300 OR NOT EXISTS (SELECT 1 FROM wallet_private.worker_assignments a WHERE a.login_name=session_user AND a.tenant_id=p_tenant) THEN RETURN false; END IF;
  PERFORM set_config('wallet.tenant_id',p_tenant,true);
  UPDATE wallet_private.outbox SET lease_until=clock_timestamp()+p_seconds*interval '1 second'
   WHERE tenant_id=p_tenant AND network='testnet' AND event_id=p_event AND lease_token=p_token AND lease_until>clock_timestamp() AND completed_at IS NULL;
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION wallet_private.renew_fixture(text,text,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wallet_private.renew_fixture(text,text,text,integer) TO wallet_worker;
