-- Verified Testnet payment evidence and demo delivery evidence. Broadcast stays disabled:
-- these transitions only record what a trusted RPC already shows for the stored envelope.
CREATE TABLE wallet_private.payment_evidence (
  tenant_id text NOT NULL, network text NOT NULL CHECK (network='testnet'),
  order_id text NOT NULL, attempt_id text NOT NULL,
  network_passphrase text NOT NULL CHECK (network_passphrase='Test SDF Network ; September 2015'),
  tx_hash text NOT NULL CHECK (tx_hash ~ '^[0-9a-f]{64}$'),
  ledger bigint NOT NULL CHECK (ledger > 0),
  event_index integer NOT NULL CHECK (event_index >= 0),
  asset_contract_id text NOT NULL, source_address text NOT NULL, recipient_address text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0 AND amount = trunc(amount)),
  envelope_digest bytea NOT NULL CHECK (octet_length(envelope_digest)=32),
  verified_at timestamptz NOT NULL DEFAULT now(),
  -- One piece of chain evidence can settle exactly one order in exactly one tenant.
  PRIMARY KEY (network, tx_hash),
  UNIQUE (tenant_id, network, order_id),
  UNIQUE (tenant_id, network, attempt_id),
  FOREIGN KEY (tenant_id, network, order_id) REFERENCES wallet_private.orders,
  FOREIGN KEY (tenant_id, network, attempt_id) REFERENCES wallet_private.attempts
);
CREATE TABLE wallet_private.delivery_evidence (
  tenant_id text NOT NULL, network text NOT NULL CHECK (network='testnet'), order_id text NOT NULL,
  provider_id text NOT NULL CHECK (provider_id='demo-report-provider'),
  evidence_id text NOT NULL CHECK (evidence_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$'),
  digest text NOT NULL CHECK (digest ~ '^[0-9a-f]{64}$'),
  artifact_bytes integer NOT NULL CHECK (artifact_bytes BETWEEN 1 AND 65536),
  payment_tx_hash text NOT NULL,
  delivered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, network, order_id),
  UNIQUE (provider_id, evidence_id),
  FOREIGN KEY (tenant_id, network, order_id) REFERENCES wallet_private.orders,
  -- Delivery cannot exist without verified payment evidence.
  FOREIGN KEY (network, payment_tx_hash) REFERENCES wallet_private.payment_evidence (network, tx_hash)
);
DO $$
DECLARE relation_name text;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY['payment_evidence','delivery_evidence'] LOOP
    EXECUTE format('ALTER TABLE wallet_private.%I ENABLE ROW LEVEL SECURITY', relation_name);
    EXECUTE format('ALTER TABLE wallet_private.%I FORCE ROW LEVEL SECURITY', relation_name);
    EXECUTE format('CREATE POLICY tenant_scope ON wallet_private.%I USING (tenant_id = nullif(current_setting(''wallet.tenant_id'', true), '''')) WITH CHECK (tenant_id = nullif(current_setting(''wallet.tenant_id'', true), ''''))', relation_name);
    EXECUTE format('REVOKE ALL ON wallet_private.%I FROM PUBLIC, wallet_api, wallet_worker', relation_name);
    EXECUTE format('GRANT SELECT ON wallet_private.%I TO wallet_api', relation_name);
  END LOOP;
END $$;
-- The API may only enqueue payment work; delivery work is created by a verified confirmation.
CREATE POLICY api_payment_events_only ON wallet_private.outbox AS RESTRICTIVE FOR INSERT TO wallet_api WITH CHECK (kind = 'payment');

CREATE FUNCTION wallet_private.confirm_testnet_payment(p_tenant text,p_event text,p_token text,p_attempt text,p_hash text,p_passphrase text,
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
     AND e.attempt_id=p_attempt AND e.xdr_digest=p_digest AND e.network_passphrase=p_passphrase) THEN RETURN false; END IF;
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

CREATE FUNCTION wallet_private.claim_testnet_delivery(p_seconds integer)
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
      JOIN wallet_private.payment_evidence pe USING(tenant_id,network,order_id)
      WHERE o.tenant_id=assignment.tenant_id AND o.network='testnet' AND o.kind='delivery' AND o.completed_at IS NULL
        AND (o.lease_until IS NULL OR o.lease_until<=clock_timestamp()) AND c.mode='testnet'
        AND ord.payment_state='confirmed' AND ord.delivery_state='pending'
      ORDER BY o.event_id FOR UPDATE OF o SKIP LOCKED LIMIT 1)
    RETURNING ob.tenant_id,ob.event_id,ob.order_id INTO claimed;
    IF FOUND THEN RETURN QUERY SELECT claimed.tenant_id,claimed.event_id,claimed.order_id,token; RETURN; END IF;
  END LOOP;
END $$;

CREATE FUNCTION wallet_private.read_testnet_delivery(p_tenant text,p_event text,p_token text)
RETURNS TABLE(order_id text,offer_id text,amount numeric,tx_hash text,ledger bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,wallet_private AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM wallet_private.worker_assignments a WHERE a.login_name=session_user AND a.tenant_id=p_tenant) THEN RETURN; END IF;
  PERFORM set_config('wallet.tenant_id',p_tenant,true);
  RETURN QUERY SELECT ord.order_id,ord.offer_id,ord.amount,pe.tx_hash,pe.ledger
   FROM wallet_private.outbox ob JOIN wallet_private.orders ord USING(tenant_id,network,order_id)
   JOIN wallet_private.cards c USING(tenant_id,network,card_id)
   JOIN wallet_private.payment_evidence pe USING(tenant_id,network,order_id)
   WHERE ob.tenant_id=p_tenant AND ob.network='testnet' AND ob.event_id=p_event AND ob.kind='delivery'
     AND ob.lease_token=p_token AND ob.lease_until>clock_timestamp() AND ob.completed_at IS NULL
     AND c.mode='testnet' AND ord.payment_state='confirmed' AND ord.delivery_state='pending';
END $$;

CREATE FUNCTION wallet_private.record_demo_delivery(p_tenant text,p_event text,p_token text,p_provider text,p_evidence_id text,p_digest text,p_artifact_bytes integer,p_payment_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,wallet_private AS $$
DECLARE task wallet_private.outbox%ROWTYPE; item wallet_private.orders%ROWTYPE; prior wallet_private.delivery_evidence%ROWTYPE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM wallet_private.worker_assignments a WHERE a.login_name=session_user AND a.tenant_id=p_tenant) THEN RETURN false; END IF;
  IF p_provider IS DISTINCT FROM 'demo-report-provider' OR p_digest IS NULL OR p_digest !~ '^[0-9a-f]{64}$' OR p_evidence_id IS NULL
     OR p_artifact_bytes IS NULL OR p_artifact_bytes<1 OR p_artifact_bytes>65536 THEN RETURN false; END IF;
  PERFORM set_config('wallet.tenant_id',p_tenant,true);
  SELECT * INTO task FROM wallet_private.outbox o WHERE o.tenant_id=p_tenant AND o.network='testnet' AND o.event_id=p_event
    AND o.kind='delivery' AND o.lease_token=p_token FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF task.completed_at IS NOT NULL THEN
    SELECT * INTO prior FROM wallet_private.delivery_evidence d WHERE d.tenant_id=p_tenant AND d.network=task.network AND d.order_id=task.order_id;
    RETURN COALESCE(FOUND AND prior.provider_id=p_provider AND prior.evidence_id=p_evidence_id AND prior.digest=p_digest
      AND prior.artifact_bytes=p_artifact_bytes AND prior.payment_tx_hash=p_payment_hash, false);
  END IF;
  IF task.lease_until IS NULL OR task.lease_until<=clock_timestamp() THEN RETURN false; END IF;
  SELECT * INTO item FROM wallet_private.orders o WHERE o.tenant_id=p_tenant AND o.network=task.network AND o.order_id=task.order_id FOR UPDATE;
  IF item.payment_state<>'confirmed' OR item.delivery_state<>'pending'
     OR NOT EXISTS (SELECT 1 FROM wallet_private.cards c WHERE c.tenant_id=p_tenant AND c.network=task.network AND c.card_id=item.card_id AND c.mode='testnet')
     OR NOT EXISTS (SELECT 1 FROM wallet_private.payment_evidence pe WHERE pe.tenant_id=p_tenant AND pe.network=task.network AND pe.order_id=task.order_id AND pe.tx_hash=p_payment_hash)
  THEN RETURN false; END IF;
  INSERT INTO wallet_private.delivery_evidence(tenant_id,network,order_id,provider_id,evidence_id,digest,artifact_bytes,payment_tx_hash)
   VALUES(p_tenant,task.network,task.order_id,p_provider,p_evidence_id,p_digest,p_artifact_bytes,p_payment_hash);
  UPDATE wallet_private.orders SET delivery_state='delivered' WHERE tenant_id=p_tenant AND network=task.network AND order_id=task.order_id;
  UPDATE wallet_private.receipts SET provider_id=p_provider,evidence_id=p_evidence_id,evidence_digest=p_digest
   WHERE tenant_id=p_tenant AND network=task.network AND order_id=task.order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'receipt missing for delivery'; END IF;
  UPDATE wallet_private.outbox SET completed_at=clock_timestamp() WHERE tenant_id=p_tenant AND network=task.network AND event_id=p_event;
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION wallet_private.confirm_testnet_payment(text,text,text,text,text,text,bigint,integer,text,text,text,numeric,bytea),
  wallet_private.claim_testnet_delivery(integer),wallet_private.read_testnet_delivery(text,text,text),
  wallet_private.record_demo_delivery(text,text,text,text,text,text,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wallet_private.confirm_testnet_payment(text,text,text,text,text,text,bigint,integer,text,text,text,numeric,bytea),
  wallet_private.claim_testnet_delivery(integer),wallet_private.read_testnet_delivery(text,text,text),
  wallet_private.record_demo_delivery(text,text,text,text,text,text,integer,text) TO wallet_worker;
