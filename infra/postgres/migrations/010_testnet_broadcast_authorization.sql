-- Human authorization for one Testnet broadcast. An administrator binds a single order to the exact
-- hash of its stored, signed v2 envelope, with an expiry and a bounded number of re-sends of those
-- same bytes. Runtime roles cannot create, read or alter authorizations.
CREATE TABLE wallet_private.broadcast_authorizations (
  tenant_id text NOT NULL, network text NOT NULL CHECK (network='testnet'),
  order_id text NOT NULL, attempt_id text NOT NULL,
  tx_hash text NOT NULL CHECK (tx_hash ~ '^[0-9a-f]{64}$'),
  -- Only the 0.50 USDC test purchase can be authorized.
  amount numeric NOT NULL CHECK (amount = 5000000),
  authorized_by text NOT NULL CHECK (length(authorized_by) BETWEEN 1 AND 128),
  reason text NOT NULL CHECK (length(reason) BETWEEN 1 AND 500),
  authorized_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  max_sends integer NOT NULL DEFAULT 3 CHECK (max_sends BETWEEN 1 AND 5),
  send_count integer NOT NULL DEFAULT 0,
  first_sent_at timestamptz, last_sent_at timestamptz,
  PRIMARY KEY (network, tx_hash),
  UNIQUE (tenant_id, network, order_id),
  CHECK (send_count BETWEEN 0 AND max_sends),
  CHECK (expires_at > authorized_at AND expires_at <= authorized_at + interval '24 hours'),
  FOREIGN KEY (tenant_id, network, order_id) REFERENCES wallet_private.orders,
  FOREIGN KEY (tenant_id, network, attempt_id) REFERENCES wallet_private.attempts
);
ALTER TABLE wallet_private.broadcast_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_private.broadcast_authorizations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON wallet_private.broadcast_authorizations
  USING (tenant_id = nullif(current_setting('wallet.tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('wallet.tenant_id', true), ''));
CREATE POLICY api_credential_scope ON wallet_private.broadcast_authorizations AS RESTRICTIVE TO wallet_api
  USING (tenant_id = (SELECT wallet_private.api_tenant())) WITH CHECK (tenant_id = (SELECT wallet_private.api_tenant()));
REVOKE ALL ON wallet_private.broadcast_authorizations FROM PUBLIC, wallet_api, wallet_worker;

-- Administrator only (no runtime grant). Validates that the hash is the stored v2 envelope of a
-- pending Testnet order for 0.50 USDC before recording the authorization.
CREATE FUNCTION wallet_private.authorize_testnet_broadcast(p_tenant text,p_order text,p_hash text,p_authorized_by text,p_reason text,p_minutes integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,wallet_private AS $$
DECLARE att wallet_private.attempts%ROWTYPE; at_time timestamptz := clock_timestamp();
BEGIN
  IF p_minutes IS NULL OR p_minutes < 1 OR p_minutes > 1440 THEN RAISE EXCEPTION 'authorization window must be 1-1440 minutes'; END IF;
  PERFORM set_config('wallet.tenant_id',p_tenant,true);
  SELECT a.* INTO att FROM wallet_private.attempts a
    JOIN wallet_private.orders o ON o.tenant_id=a.tenant_id AND o.network=a.network AND o.order_id=a.order_id
    JOIN wallet_private.cards c ON c.tenant_id=o.tenant_id AND c.network=o.network AND c.card_id=o.card_id
    JOIN wallet_private.encrypted_envelopes e ON e.tenant_id=a.tenant_id AND e.network=a.network AND e.attempt_id=a.attempt_id
   WHERE a.tenant_id=p_tenant AND a.network='testnet' AND a.order_id=p_order AND a.tx_hash=p_hash
     AND a.state IN ('prepared','uncertain') AND o.payment_state IN ('pending','uncertain') AND o.amount=5000000
     AND c.mode='testnet' AND e.spend_interface=2 AND e.policy_revision=c.policy_revision;
  IF NOT FOUND THEN RAISE EXCEPTION 'no stored v2 envelope with this hash for a pending Testnet order'; END IF;
  INSERT INTO wallet_private.broadcast_authorizations(tenant_id,network,order_id,attempt_id,tx_hash,amount,authorized_by,reason,authorized_at,expires_at)
  VALUES (p_tenant,'testnet',p_order,att.attempt_id,p_hash,5000000,p_authorized_by,p_reason,at_time,at_time+p_minutes*interval '1 minute');
END $$;
REVOKE ALL ON FUNCTION wallet_private.authorize_testnet_broadcast(text,text,text,text,text,integer) FROM PUBLIC;

-- Worker transition under a live lease: consumes one send of the authorized hash and persists the
-- uncertain state BEFORE the external send. It never creates attempts or releases holds.
CREATE FUNCTION wallet_private.begin_testnet_broadcast(p_tenant text,p_event text,p_token text,p_attempt text,p_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,wallet_private AS $$
DECLARE task wallet_private.outbox%ROWTYPE; auth wallet_private.broadcast_authorizations%ROWTYPE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM wallet_private.worker_assignments a WHERE a.login_name=session_user AND a.tenant_id=p_tenant) THEN RETURN false; END IF;
  PERFORM set_config('wallet.tenant_id',p_tenant,true);
  SELECT * INTO task FROM wallet_private.outbox o WHERE o.tenant_id=p_tenant AND o.network='testnet' AND o.event_id=p_event AND o.kind='payment'
    AND o.lease_token=p_token AND o.lease_until>clock_timestamp() AND o.completed_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT * INTO auth FROM wallet_private.broadcast_authorizations b WHERE b.network='testnet' AND b.tx_hash=p_hash
    AND b.tenant_id=p_tenant AND b.order_id=task.order_id AND b.attempt_id=p_attempt FOR UPDATE;
  IF NOT FOUND OR auth.revoked_at IS NOT NULL OR auth.expires_at<=clock_timestamp() OR auth.send_count>=auth.max_sends THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM wallet_private.attempts a JOIN wallet_private.orders o USING(tenant_id,network,order_id)
      JOIN wallet_private.cards c USING(tenant_id,network,card_id)
      JOIN wallet_private.encrypted_envelopes e USING(tenant_id,network,attempt_id)
     WHERE a.tenant_id=p_tenant AND a.network='testnet' AND a.order_id=task.order_id AND a.attempt_id=p_attempt AND a.tx_hash=p_hash
       AND a.state IN ('prepared','uncertain') AND o.payment_state IN ('pending','uncertain') AND c.mode='testnet' AND e.spend_interface=2) THEN RETURN false; END IF;
  UPDATE wallet_private.broadcast_authorizations SET send_count=send_count+1,first_sent_at=COALESCE(first_sent_at,clock_timestamp()),last_sent_at=clock_timestamp()
   WHERE network='testnet' AND tx_hash=p_hash;
  UPDATE wallet_private.attempts SET state='uncertain' WHERE tenant_id=p_tenant AND network='testnet' AND attempt_id=p_attempt;
  UPDATE wallet_private.orders SET payment_state='uncertain' WHERE tenant_id=p_tenant AND network='testnet' AND order_id=task.order_id;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION wallet_private.begin_testnet_broadcast(text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wallet_private.begin_testnet_broadcast(text,text,text,text,text) TO wallet_worker;
