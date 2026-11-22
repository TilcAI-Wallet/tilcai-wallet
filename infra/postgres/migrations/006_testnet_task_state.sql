-- No worker DML privileges; assigned login and fencing are checked in each function.
CREATE FUNCTION wallet_private.read_testnet_task(p_tenant text,p_event text,p_token text)
RETURNS TABLE(order_id text,attempt_id text,attempt_state text,tx_hash text,contract_id text,agent text,asset_id text,recipient text,amount numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,wallet_private AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM wallet_private.worker_assignments a WHERE a.login_name=session_user AND a.tenant_id=p_tenant) THEN RETURN; END IF;
  PERFORM set_config('wallet.tenant_id',p_tenant,true);
  RETURN QUERY SELECT ord.order_id,att.attempt_id,att.state,att.tx_hash,c.contract_id,c.agent,c.asset_id,c.recipient,ord.amount
   FROM wallet_private.outbox ob JOIN wallet_private.orders ord USING(tenant_id,network,order_id)
   JOIN wallet_private.cards c USING(tenant_id,network,card_id)
   JOIN wallet_private.attempts att USING(tenant_id,network,order_id)
   WHERE ob.tenant_id=p_tenant AND ob.network='testnet' AND ob.event_id=p_event AND ob.kind='payment'
    AND ob.lease_token=p_token AND ob.lease_until>clock_timestamp() AND ob.completed_at IS NULL
    AND c.mode='testnet' AND ord.payment_state IN ('pending','uncertain') AND att.state IN ('created','prepared','uncertain');
END $$;
CREATE FUNCTION wallet_private.mark_testnet_uncertain(p_tenant text,p_event text,p_token text,p_attempt text,p_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,wallet_private AS $$
DECLARE task wallet_private.outbox%ROWTYPE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM wallet_private.worker_assignments a WHERE a.login_name=session_user AND a.tenant_id=p_tenant) THEN RETURN false; END IF;
  PERFORM set_config('wallet.tenant_id',p_tenant,true);
  SELECT * INTO task FROM wallet_private.outbox o WHERE o.tenant_id=p_tenant AND o.network='testnet' AND o.event_id=p_event AND o.kind='payment'
    AND o.lease_token=p_token AND o.lease_until>clock_timestamp() AND o.completed_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE wallet_private.attempts a SET state='uncertain' WHERE a.tenant_id=p_tenant AND a.network=task.network AND a.order_id=task.order_id
    AND a.attempt_id=p_attempt AND a.tx_hash=p_hash AND a.state IN ('prepared','uncertain')
    AND EXISTS (SELECT 1 FROM wallet_private.encrypted_envelopes e WHERE e.tenant_id=a.tenant_id AND e.network=a.network AND e.attempt_id=a.attempt_id);
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE wallet_private.orders SET payment_state='uncertain' WHERE tenant_id=p_tenant AND network=task.network AND order_id=task.order_id AND payment_state IN ('pending','uncertain');
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid payment transition'; END IF;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION wallet_private.read_testnet_task(text,text,text),wallet_private.mark_testnet_uncertain(text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wallet_private.read_testnet_task(text,text,text),wallet_private.mark_testnet_uncertain(text,text,text,text,text) TO wallet_worker;
