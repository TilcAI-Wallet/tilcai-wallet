-- Initial storage foundation. Apply only through a migration owner, never the API role.
-- No runtime grants are made here: provisioning and authentication remain separate.
CREATE SCHEMA IF NOT EXISTS wallet_private;
REVOKE ALL ON SCHEMA wallet_private FROM PUBLIC;
CREATE TABLE IF NOT EXISTS wallet_private.tenants (
  tenant_id text PRIMARY KEY
);
CREATE TABLE IF NOT EXISTS wallet_private.sessions (
  tenant_id text NOT NULL REFERENCES wallet_private.tenants(tenant_id),
  network text NOT NULL CHECK (network = 'testnet'),
  session_id text NOT NULL, actor_id text NOT NULL,
  expires_at timestamptz NOT NULL, revoked_at timestamptz,
  PRIMARY KEY (tenant_id, network, session_id)
);
CREATE TABLE IF NOT EXISTS wallet_private.credentials (
  tenant_id text NOT NULL, network text NOT NULL, session_id text NOT NULL,
  token_hash bytea NOT NULL CHECK (octet_length(token_hash) = 32),
  scopes text[] NOT NULL, expires_at timestamptz NOT NULL, revoked_at timestamptz,
  PRIMARY KEY (tenant_id, network, token_hash),
  UNIQUE (token_hash),
  FOREIGN KEY (tenant_id, network, session_id) REFERENCES wallet_private.sessions
);
CREATE TABLE IF NOT EXISTS wallet_private.cards (
  tenant_id text NOT NULL, network text NOT NULL, card_id text NOT NULL,
  session_id text NOT NULL, contract_id text NOT NULL, asset_id text NOT NULL,
  recipient text NOT NULL, agent text NOT NULL,
  PRIMARY KEY (tenant_id, network, card_id),
  UNIQUE (tenant_id, network, card_id, session_id),
  FOREIGN KEY (tenant_id, network, session_id) REFERENCES wallet_private.sessions
);
CREATE TABLE IF NOT EXISTS wallet_private.orders (
  tenant_id text NOT NULL, network text NOT NULL, order_id text NOT NULL,
  card_id text NOT NULL, session_id text NOT NULL, offer_id text NOT NULL,
  amount numeric NOT NULL CHECK (amount = trunc(amount) AND amount > 0 AND amount <= 170141183460469231731687303715884105727),
  payment_state text NOT NULL CHECK (payment_state IN ('pending','uncertain','confirmed','failed')),
  delivery_state text NOT NULL CHECK (delivery_state IN ('pending','delivered','failed')),
  refund_state text NOT NULL CHECK (refund_state IN ('none','pending','confirmed','failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, network, order_id),
  FOREIGN KEY (tenant_id, network, card_id, session_id) REFERENCES wallet_private.cards (tenant_id, network, card_id, session_id),
  FOREIGN KEY (tenant_id, network, session_id) REFERENCES wallet_private.sessions
);
CREATE TABLE IF NOT EXISTS wallet_private.idempotency (
  tenant_id text NOT NULL, network text NOT NULL, session_id text NOT NULL,
  operation text NOT NULL, key text NOT NULL, request_hash bytea NOT NULL CHECK (octet_length(request_hash) = 32),
  order_id text NOT NULL,
  PRIMARY KEY (tenant_id, network, session_id, operation, key),
  FOREIGN KEY (tenant_id, network, session_id) REFERENCES wallet_private.sessions,
  FOREIGN KEY (tenant_id, network, order_id) REFERENCES wallet_private.orders
);
CREATE TABLE IF NOT EXISTS wallet_private.holds (
  tenant_id text NOT NULL, network text NOT NULL, order_id text NOT NULL,
  amount numeric NOT NULL CHECK (amount = trunc(amount) AND amount > 0 AND amount <= 170141183460469231731687303715884105727),
  released_at timestamptz,
  PRIMARY KEY (tenant_id, network, order_id),
  FOREIGN KEY (tenant_id, network, order_id) REFERENCES wallet_private.orders
);
CREATE TABLE IF NOT EXISTS wallet_private.attempts (
  tenant_id text NOT NULL, network text NOT NULL, order_id text NOT NULL, attempt_id text NOT NULL,
  state text NOT NULL CHECK (state IN ('created','prepared','uncertain','confirmed','failed','expired')),
  tx_hash text CHECK (tx_hash IS NULL OR tx_hash ~ '^[0-9a-f]{64}$'),
  envelope_ref text, valid_through_ledger bigint CHECK (valid_through_ledger > 0),
  PRIMARY KEY (tenant_id, network, attempt_id),
  FOREIGN KEY (tenant_id, network, order_id) REFERENCES wallet_private.orders,
  UNIQUE (network, tx_hash),
  CHECK ((tx_hash IS NULL AND envelope_ref IS NULL AND valid_through_ledger IS NULL) OR
         (tx_hash IS NOT NULL AND envelope_ref IS NOT NULL AND valid_through_ledger IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_attempt_per_order ON wallet_private.attempts (tenant_id, network, order_id)
  WHERE state IN ('created','prepared','uncertain');
CREATE TABLE IF NOT EXISTS wallet_private.receipts (
  tenant_id text NOT NULL, network text NOT NULL, receipt_id text NOT NULL, order_id text NOT NULL,
  ledger bigint CHECK (ledger > 0), tx_hash text CHECK (tx_hash IS NULL OR tx_hash ~ '^[0-9a-f]{64}$'),
  provider_id text, evidence_id text, evidence_digest text,
  PRIMARY KEY (tenant_id, network, receipt_id), UNIQUE (tenant_id, network, order_id),
  FOREIGN KEY (tenant_id, network, order_id) REFERENCES wallet_private.orders
);
CREATE TABLE IF NOT EXISTS wallet_private.outbox (
  tenant_id text NOT NULL, network text NOT NULL, event_id text NOT NULL, order_id text NOT NULL,
  kind text NOT NULL, lease_token text, lease_until timestamptz, completed_at timestamptz,
  PRIMARY KEY (tenant_id, network, event_id), UNIQUE (tenant_id, network, order_id, kind),
  FOREIGN KEY (tenant_id, network, order_id) REFERENCES wallet_private.orders,
  CHECK ((lease_token IS NULL) = (lease_until IS NULL))
);
CREATE TABLE IF NOT EXISTS wallet_private.inbox (
  tenant_id text NOT NULL, network text NOT NULL, tx_hash text NOT NULL, event_index integer NOT NULL CHECK (event_index >= 0),
  order_id text NOT NULL, ledger bigint NOT NULL CHECK (ledger > 0),
  PRIMARY KEY (network, tx_hash, event_index),
  FOREIGN KEY (tenant_id, network, order_id) REFERENCES wallet_private.orders
);
CREATE TABLE IF NOT EXISTS wallet_private.cursors (
  tenant_id text NOT NULL, network text NOT NULL, contract_id text NOT NULL, cursor text NOT NULL,
  PRIMARY KEY (tenant_id, network, contract_id), FOREIGN KEY (tenant_id) REFERENCES wallet_private.tenants
);
-- Deny by default when the transaction-local tenant context is absent.
DO $$
DECLARE relation_name text;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY['tenants','sessions','credentials','cards','orders','idempotency','holds','attempts','receipts','outbox','inbox','cursors'] LOOP
    EXECUTE format('ALTER TABLE wallet_private.%I ENABLE ROW LEVEL SECURITY', relation_name);
    EXECUTE format('ALTER TABLE wallet_private.%I FORCE ROW LEVEL SECURITY', relation_name);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'wallet_private' AND tablename = relation_name AND policyname = 'tenant_scope') THEN
      EXECUTE format('CREATE POLICY tenant_scope ON wallet_private.%I USING (tenant_id = nullif(current_setting(''wallet.tenant_id'', true), '''')) WITH CHECK (tenant_id = nullif(current_setting(''wallet.tenant_id'', true), ''''))', relation_name);
    END IF;
  END LOOP;
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA wallet_private FROM PUBLIC;
