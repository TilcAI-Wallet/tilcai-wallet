-- Testnet storage only. This migration does not enable submission or confirmation.
ALTER TABLE wallet_private.cards DROP CONSTRAINT cards_mode_check;
ALTER TABLE wallet_private.cards ADD CONSTRAINT cards_mode_check CHECK (mode IN ('fixture','testnet'));
CREATE TABLE wallet_private.encrypted_envelopes (
  tenant_id text NOT NULL, network text NOT NULL CHECK (network='testnet'), attempt_id text NOT NULL,
  network_passphrase text NOT NULL DEFAULT 'Test SDF Network ; September 2015' CHECK (network_passphrase='Test SDF Network ; September 2015'),
  key_id text NOT NULL CHECK (key_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  nonce bytea NOT NULL CHECK (octet_length(nonce)=12),
  ciphertext bytea NOT NULL CHECK (octet_length(ciphertext) BETWEEN 1 AND 1048576),
  tag bytea NOT NULL CHECK (octet_length(tag)=16),
  xdr_digest bytea NOT NULL CHECK (octet_length(xdr_digest)=32),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id,network,attempt_id), UNIQUE (key_id,nonce),
  FOREIGN KEY (tenant_id,network,attempt_id) REFERENCES wallet_private.attempts
);
ALTER TABLE wallet_private.encrypted_envelopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_private.encrypted_envelopes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON wallet_private.encrypted_envelopes USING (tenant_id = nullif(current_setting('wallet.tenant_id', true),'')) WITH CHECK (tenant_id = nullif(current_setting('wallet.tenant_id', true),''));
REVOKE ALL ON wallet_private.encrypted_envelopes FROM PUBLIC,wallet_api,wallet_worker;

CREATE FUNCTION wallet_private.claim_testnet(p_seconds integer)
RETURNS TABLE(tenant_id text,event_id text,order_id text,lease_token text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,wallet_private AS $$
DECLARE assignment record; claimed record; token text;
BEGIN
  IF p_seconds IS NULL OR p_seconds<1 OR p_seconds>300 THEN RAISE EXCEPTION 'invalid lease'; END IF;
  FOR assignment IN SELECT a.tenant_id FROM wallet_private.worker_assignments a WHERE a.login_name=session_user ORDER BY a.tenant_id LOOP
    PERFORM set_config('wallet.tenant_id',assignment.tenant_id,true);
    token:=gen_random_uuid()::text;
    UPDATE wallet_private.outbox ob SET lease_token=token,lease_until=clock_timestamp()+p_seconds*interval '1 second'
    WHERE ob.tenant_id=assignment.tenant_id AND ob.network='testnet' AND ob.event_id=(
      SELECT o.event_id FROM wallet_private.outbox o
      JOIN wallet_private.orders ord USING(tenant_id,network,order_id)
      JOIN wallet_private.cards c USING(tenant_id,network,card_id)
      WHERE o.tenant_id=assignment.tenant_id AND o.network='testnet' AND o.kind='payment' AND o.completed_at IS NULL
        AND (o.lease_until IS NULL OR o.lease_until<=clock_timestamp()) AND c.mode='testnet' AND ord.payment_state IN ('pending','uncertain')
      ORDER BY o.event_id FOR UPDATE OF o SKIP LOCKED LIMIT 1)
    RETURNING ob.tenant_id,ob.event_id,ob.order_id INTO claimed;
    IF FOUND THEN RETURN QUERY SELECT claimed.tenant_id,claimed.event_id,claimed.order_id,token; RETURN; END IF;
  END LOOP;
END $$;

CREATE FUNCTION wallet_private.store_testnet_envelope(p_tenant text,p_event text,p_token text,p_attempt text,p_order text,p_contract text,p_agent text,p_hash text,p_ledger bigint,p_key_id text,p_nonce bytea,p_ciphertext bytea,p_tag bytea,p_digest bytea)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,wallet_private AS $$
DECLARE task wallet_private.outbox%ROWTYPE; n integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM wallet_private.worker_assignments a WHERE a.login_name=session_user AND a.tenant_id=p_tenant) THEN RETURN false; END IF;
  IF p_hash IS NULL OR p_hash !~ '^[0-9a-f]{64}$' OR p_ledger IS NULL OR p_ledger<1 THEN RAISE EXCEPTION 'invalid envelope metadata'; END IF;
  PERFORM set_config('wallet.tenant_id',p_tenant,true);
  SELECT * INTO task FROM wallet_private.outbox o WHERE o.tenant_id=p_tenant AND o.network='testnet' AND o.event_id=p_event AND o.kind='payment' AND o.lease_token=p_token AND o.lease_until>clock_timestamp() AND o.completed_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM wallet_private.orders o JOIN wallet_private.cards c USING(tenant_id,network,card_id) WHERE o.tenant_id=p_tenant AND o.network=task.network AND o.order_id=task.order_id AND o.order_id=p_order AND c.contract_id=p_contract AND c.agent=p_agent AND c.mode='testnet') THEN RETURN false; END IF;
  UPDATE wallet_private.attempts a SET state='prepared',tx_hash=p_hash,envelope_ref='private:encrypted',valid_through_ledger=p_ledger
   WHERE a.tenant_id=p_tenant AND a.network=task.network AND a.order_id=task.order_id AND a.attempt_id=p_attempt AND a.state='created' AND a.tx_hash IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n<>1 THEN RETURN false; END IF;
  INSERT INTO wallet_private.encrypted_envelopes(tenant_id,network,attempt_id,key_id,nonce,ciphertext,tag,xdr_digest)
   VALUES(p_tenant,task.network,p_attempt,p_key_id,p_nonce,p_ciphertext,p_tag,p_digest);
  RETURN true;
END $$;

CREATE FUNCTION wallet_private.load_testnet_envelope(p_tenant text,p_event text,p_token text,p_attempt text)
RETURNS TABLE(key_id text,nonce bytea,ciphertext bytea,tag bytea,xdr_digest bytea,tx_hash text,valid_through_ledger bigint,order_id text,contract_id text,agent text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,wallet_private AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM wallet_private.worker_assignments a WHERE a.login_name=session_user AND a.tenant_id=p_tenant) THEN RETURN; END IF;
  PERFORM set_config('wallet.tenant_id',p_tenant,true);
  RETURN QUERY SELECT e.key_id,e.nonce,e.ciphertext,e.tag,e.xdr_digest,at.tx_hash,at.valid_through_ledger,ord.order_id,c.contract_id,c.agent
   FROM wallet_private.outbox ob
   JOIN wallet_private.orders ord USING(tenant_id,network,order_id)
   JOIN wallet_private.cards c USING(tenant_id,network,card_id)
   JOIN wallet_private.attempts at USING(tenant_id,network,order_id)
   JOIN wallet_private.encrypted_envelopes e USING(tenant_id,network,attempt_id)
   WHERE ob.tenant_id=p_tenant AND ob.network='testnet' AND ob.event_id=p_event AND ob.kind='payment' AND ob.lease_token=p_token
     AND ob.lease_until>clock_timestamp() AND ob.completed_at IS NULL AND at.attempt_id=p_attempt AND at.state IN ('prepared','uncertain') AND c.mode='testnet';
END $$;
REVOKE ALL ON FUNCTION wallet_private.claim_testnet(integer),wallet_private.store_testnet_envelope(text,text,text,text,text,text,text,text,bigint,text,bytea,bytea,bytea,bytea),wallet_private.load_testnet_envelope(text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wallet_private.claim_testnet(integer),wallet_private.store_testnet_envelope(text,text,text,text,text,text,text,text,bigint,text,bytea,bytea,bytea,bytea),wallet_private.load_testnet_envelope(text,text,text,text) TO wallet_worker;
