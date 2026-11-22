-- WalletFoundation v2: the agent signs spend(amount, recipient, expected_policy_revision).
-- Each Testnet card records the policy revision an administrator reviewed; envelopes record
-- the interface and revision they were signed for. Envelopes signed for v1 spend(amount) stay
-- stored for audit, are never confirmed and are never regenerated automatically.
ALTER TABLE wallet_private.cards ADD COLUMN policy_revision bigint CHECK (policy_revision >= 0);
ALTER TABLE wallet_private.encrypted_envelopes ADD COLUMN spend_interface smallint NOT NULL DEFAULT 1 CHECK (spend_interface IN (1,2));
ALTER TABLE wallet_private.encrypted_envelopes ALTER COLUMN spend_interface DROP DEFAULT;
ALTER TABLE wallet_private.encrypted_envelopes ADD COLUMN policy_revision bigint CHECK (policy_revision >= 0);
ALTER TABLE wallet_private.encrypted_envelopes ADD CONSTRAINT envelope_interface_revision
  CHECK ((spend_interface = 1 AND policy_revision IS NULL) OR (spend_interface = 2 AND policy_revision IS NOT NULL));

-- The v1 storage entry point is removed: an outdated worker cannot persist a v1 envelope.
DROP FUNCTION wallet_private.store_testnet_envelope(text,text,text,text,text,text,text,text,bigint,text,bytea,bytea,bytea,bytea);
CREATE FUNCTION wallet_private.store_testnet_envelope(p_tenant text,p_event text,p_token text,p_attempt text,p_order text,p_contract text,p_agent text,p_hash text,p_ledger bigint,p_key_id text,p_nonce bytea,p_ciphertext bytea,p_tag bytea,p_digest bytea,p_policy_revision bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,wallet_private AS $$
DECLARE task wallet_private.outbox%ROWTYPE; n integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM wallet_private.worker_assignments a WHERE a.login_name=session_user AND a.tenant_id=p_tenant) THEN RETURN false; END IF;
  IF p_hash IS NULL OR p_hash !~ '^[0-9a-f]{64}$' OR p_ledger IS NULL OR p_ledger<1 OR p_policy_revision IS NULL OR p_policy_revision<0 THEN
    RAISE EXCEPTION 'invalid envelope metadata';
  END IF;
  PERFORM set_config('wallet.tenant_id',p_tenant,true);
  SELECT * INTO task FROM wallet_private.outbox o WHERE o.tenant_id=p_tenant AND o.network='testnet' AND o.event_id=p_event AND o.kind='payment' AND o.lease_token=p_token AND o.lease_until>clock_timestamp() AND o.completed_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  -- The signed revision must be the one reviewed for this card.
  IF NOT EXISTS (SELECT 1 FROM wallet_private.orders o JOIN wallet_private.cards c USING(tenant_id,network,card_id)
    WHERE o.tenant_id=p_tenant AND o.network=task.network AND o.order_id=task.order_id AND o.order_id=p_order
      AND c.contract_id=p_contract AND c.agent=p_agent AND c.mode='testnet' AND c.policy_revision=p_policy_revision) THEN RETURN false; END IF;
  UPDATE wallet_private.attempts a SET state='prepared',tx_hash=p_hash,envelope_ref='private:encrypted',valid_through_ledger=p_ledger
   WHERE a.tenant_id=p_tenant AND a.network=task.network AND a.order_id=task.order_id AND a.attempt_id=p_attempt AND a.state='created' AND a.tx_hash IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n<>1 THEN RETURN false; END IF;
  INSERT INTO wallet_private.encrypted_envelopes(tenant_id,network,attempt_id,key_id,nonce,ciphertext,tag,xdr_digest,spend_interface,policy_revision)
   VALUES(p_tenant,task.network,p_attempt,p_key_id,p_nonce,p_ciphertext,p_tag,p_digest,2,p_policy_revision);
  RETURN true;
END $$;

-- Loading returns the interface so the worker can refuse v1 envelopes explicitly.
DROP FUNCTION wallet_private.load_testnet_envelope(text,text,text,text);
CREATE FUNCTION wallet_private.load_testnet_envelope(p_tenant text,p_event text,p_token text,p_attempt text)
RETURNS TABLE(key_id text,nonce bytea,ciphertext bytea,tag bytea,xdr_digest bytea,tx_hash text,valid_through_ledger bigint,order_id text,contract_id text,agent text,spend_interface smallint,policy_revision bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,wallet_private AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM wallet_private.worker_assignments a WHERE a.login_name=session_user AND a.tenant_id=p_tenant) THEN RETURN; END IF;
  PERFORM set_config('wallet.tenant_id',p_tenant,true);
  RETURN QUERY SELECT e.key_id,e.nonce,e.ciphertext,e.tag,e.xdr_digest,at.tx_hash,at.valid_through_ledger,ord.order_id,c.contract_id,c.agent,e.spend_interface,e.policy_revision
   FROM wallet_private.outbox ob
   JOIN wallet_private.orders ord USING(tenant_id,network,order_id)
   JOIN wallet_private.cards c USING(tenant_id,network,card_id)
   JOIN wallet_private.attempts at USING(tenant_id,network,order_id)
   JOIN wallet_private.encrypted_envelopes e USING(tenant_id,network,attempt_id)
   WHERE ob.tenant_id=p_tenant AND ob.network='testnet' AND ob.event_id=p_event AND ob.kind='payment' AND ob.lease_token=p_token
     AND ob.lease_until>clock_timestamp() AND ob.completed_at IS NULL AND at.attempt_id=p_attempt AND at.state IN ('prepared','uncertain') AND c.mode='testnet';
END $$;

-- The task snapshot carries the card's reviewed policy revision.
DROP FUNCTION wallet_private.read_testnet_task(text,text,text);
CREATE FUNCTION wallet_private.read_testnet_task(p_tenant text,p_event text,p_token text)
RETURNS TABLE(order_id text,attempt_id text,attempt_state text,tx_hash text,contract_id text,agent text,asset_id text,recipient text,amount numeric,policy_revision bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,wallet_private AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM wallet_private.worker_assignments a WHERE a.login_name=session_user AND a.tenant_id=p_tenant) THEN RETURN; END IF;
  PERFORM set_config('wallet.tenant_id',p_tenant,true);
  RETURN QUERY SELECT ord.order_id,att.attempt_id,att.state,att.tx_hash,c.contract_id,c.agent,c.asset_id,c.recipient,ord.amount,c.policy_revision
   FROM wallet_private.outbox ob JOIN wallet_private.orders ord USING(tenant_id,network,order_id)
   JOIN wallet_private.cards c USING(tenant_id,network,card_id)
   JOIN wallet_private.attempts att USING(tenant_id,network,order_id)
   WHERE ob.tenant_id=p_tenant AND ob.network='testnet' AND ob.event_id=p_event AND ob.kind='payment'
    AND ob.lease_token=p_token AND ob.lease_until>clock_timestamp() AND ob.completed_at IS NULL
    AND c.mode='testnet' AND ord.payment_state IN ('pending','uncertain') AND att.state IN ('created','prepared','uncertain');
END $$;

REVOKE ALL ON FUNCTION wallet_private.store_testnet_envelope(text,text,text,text,text,text,text,text,bigint,text,bytea,bytea,bytea,bytea,bigint),
  wallet_private.load_testnet_envelope(text,text,text,text),wallet_private.read_testnet_task(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wallet_private.store_testnet_envelope(text,text,text,text,text,text,text,text,bigint,text,bytea,bytea,bytea,bytea,bigint),
  wallet_private.load_testnet_envelope(text,text,text,text),wallet_private.read_testnet_task(text,text,text) TO wallet_worker;

-- Only an envelope signed for the v2 interface can settle an order (body otherwise identical to 007).
CREATE OR REPLACE FUNCTION wallet_private.confirm_testnet_payment(p_tenant text,p_event text,p_token text,p_attempt text,p_hash text,p_passphrase text,
  p_ledger bigint,p_event_index integer,p_asset text,p_source text,p_recipient text,p_amount numeric,p_digest bytea)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,wallet_private AS $$
DECLARE task wallet_private.outbox%ROWTYPE; item wallet_private.orders%ROWTYPE; card wallet_private.cards%ROWTYPE;
  att wallet_private.attempts%ROWTYPE; prior wallet_private.payment_evidence%ROWTYPE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM wallet_private.worker_assignments a WHERE a.login_name=session_user AND a.tenant_id=p_tenant) THEN RETURN false; END IF;
  IF p_hash IS NULL OR p_hash !~ '^[0-9a-f]{64}$' OR p_ledger IS NULL OR p_ledger<1 OR p_event_index IS NULL OR p_event_index<0
     OR p_digest IS NULL OR octet_length(p_digest)<>32 OR p_amount IS NULL OR p_amount<=0 THEN RETURN false; END IF;
  PERFORM set_config('wallet.tenant_id',p_tenant,true);
  SELECT * INTO task FROM wallet_private.outbox o WHERE o.tenant_id=p_tenant AND o.network='testnet' AND o.event_id=p_event
    AND o.kind='payment' AND o.lease_token=p_token FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF task.completed_at IS NOT NULL THEN
    -- Idempotent replay after a lost acknowledgement: only identical evidence is accepted.
    SELECT * INTO prior FROM wallet_private.payment_evidence e WHERE e.tenant_id=p_tenant AND e.network=task.network AND e.order_id=task.order_id;
    RETURN COALESCE(FOUND AND prior.attempt_id=p_attempt AND prior.tx_hash=p_hash AND prior.network_passphrase=p_passphrase AND prior.ledger=p_ledger
      AND prior.event_index=p_event_index AND prior.asset_contract_id=p_asset AND prior.source_address=p_source
      AND prior.recipient_address=p_recipient AND prior.amount=p_amount AND prior.envelope_digest=p_digest, false);
  END IF;
  IF task.lease_until IS NULL OR task.lease_until<=clock_timestamp() THEN RETURN false; END IF;
  SELECT * INTO item FROM wallet_private.orders o WHERE o.tenant_id=p_tenant AND o.network=task.network AND o.order_id=task.order_id FOR UPDATE;
  SELECT * INTO card FROM wallet_private.cards c WHERE c.tenant_id=p_tenant AND c.network=task.network AND c.card_id=item.card_id;
  IF card.mode IS DISTINCT FROM 'testnet' OR item.payment_state NOT IN ('pending','uncertain') THEN RETURN false; END IF;
  SELECT * INTO att FROM wallet_private.attempts a WHERE a.tenant_id=p_tenant AND a.network=task.network AND a.order_id=task.order_id
    AND a.attempt_id=p_attempt AND a.state IN ('prepared','uncertain') FOR UPDATE;
  IF NOT FOUND OR att.tx_hash IS DISTINCT FROM p_hash OR p_ledger>=att.valid_through_ledger THEN RETURN false; END IF;
  IF p_passphrase IS DISTINCT FROM 'Test SDF Network ; September 2015' OR p_asset IS DISTINCT FROM card.asset_id
     OR p_source IS DISTINCT FROM card.contract_id OR p_recipient IS DISTINCT FROM card.recipient OR p_amount IS DISTINCT FROM item.amount THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM wallet_private.encrypted_envelopes e WHERE e.tenant_id=p_tenant AND e.network=task.network
     AND e.attempt_id=p_attempt AND e.xdr_digest=p_digest AND e.network_passphrase=p_passphrase AND e.spend_interface=2) THEN RETURN false; END IF;
  INSERT INTO wallet_private.payment_evidence(tenant_id,network,order_id,attempt_id,network_passphrase,tx_hash,ledger,event_index,
    asset_contract_id,source_address,recipient_address,amount,envelope_digest)
  VALUES(p_tenant,task.network,task.order_id,p_attempt,p_passphrase,p_hash,p_ledger,p_event_index,p_asset,p_source,p_recipient,p_amount,p_digest);
  UPDATE wallet_private.attempts SET state='confirmed' WHERE tenant_id=p_tenant AND network=task.network AND attempt_id=p_attempt;
  UPDATE wallet_private.orders SET payment_state='confirmed' WHERE tenant_id=p_tenant AND network=task.network AND order_id=task.order_id;
  UPDATE wallet_private.receipts SET tx_hash=p_hash,ledger=p_ledger WHERE tenant_id=p_tenant AND network=task.network AND order_id=task.order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'receipt missing for verified payment'; END IF;
  UPDATE wallet_private.cards SET spent_minor=spent_minor+item.amount,balance_minor=balance_minor-item.amount
   WHERE tenant_id=p_tenant AND network=task.network AND card_id=item.card_id AND mode='testnet'
     AND balance_minor>=item.amount AND spent_minor+item.amount<=total_limit_minor;
  -- A chain/projection discrepancy stays unconfirmed for manual review instead of being hidden.
  IF NOT FOUND THEN RAISE EXCEPTION 'card projection inconsistent with verified payment'; END IF;
  UPDATE wallet_private.holds SET released_at=clock_timestamp() WHERE tenant_id=p_tenant AND network=task.network AND order_id=task.order_id AND released_at IS NULL;
  UPDATE wallet_private.outbox SET completed_at=clock_timestamp() WHERE tenant_id=p_tenant AND network=task.network AND event_id=p_event;
  INSERT INTO wallet_private.outbox(tenant_id,network,event_id,order_id,kind)
   VALUES(p_tenant,task.network,gen_random_uuid()::text,task.order_id,'delivery') ON CONFLICT DO NOTHING;
  RETURN true;
END $$;
