# Worker

`pnpm --filter @tilcai-wallet/worker check` valida la configuración local. Próximos pasos: cursor de Stellar RPC, conciliación por hash, evidencia autenticada, outbox y monitoreo de TTL. Probar reinicios, entrega tardía y resultados RPC inciertos.

El worker usará Supabase Postgres y un rol dedicado. Reclama trabajo mediante un lease, aplica el contexto del tenant al operar sobre su orden y conserva `NOT_FOUND` como incierto hasta obtener evidencia del ledger. [Persistencia y recuperación](../../docs/persistence.md)
