-- Runtime roles are not table owners. Context is set by a trusted service after authentication.
GRANT USAGE ON SCHEMA wallet_private TO wallet_api, wallet_worker;
REVOKE ALL ON ALL TABLES IN SCHEMA wallet_private FROM PUBLIC, wallet_api, wallet_worker;
GRANT SELECT ON wallet_private.sessions, wallet_private.cards, wallet_private.orders,
  wallet_private.receipts TO wallet_api;
GRANT SELECT, INSERT ON wallet_private.idempotency, wallet_private.holds,
  wallet_private.attempts, wallet_private.outbox TO wallet_api;
GRANT INSERT ON wallet_private.orders TO wallet_api;
-- Worker operates only within a tenant selected by a trusted dispatcher. No global claim granted.
GRANT SELECT ON wallet_private.orders, wallet_private.cards TO wallet_worker;
GRANT SELECT, UPDATE ON wallet_private.outbox, wallet_private.attempts TO wallet_worker;
GRANT SELECT, INSERT ON wallet_private.inbox TO wallet_worker;
GRANT SELECT, INSERT, UPDATE ON wallet_private.receipts, wallet_private.cursors TO wallet_worker;
