# Worker

`pnpm --filter @tilcai-wallet/worker check` valida la configuración local. Próximos pasos: cursor de Stellar RPC, conciliación por hash, evidencia autenticada, outbox y monitoreo de TTL. Probar reinicios, entrega tardía y resultados RPC inciertos.

El worker usará Supabase Postgres y un rol dedicado. Reclama trabajo mediante un lease, aplica el contexto del tenant al operar sobre su orden y conserva `NOT_FOUND` como incierto hasta obtener evidencia del ledger. [Persistencia y recuperación](../../docs/persistence.md)

## Trabajo preparatorio de #6

`payment-safety.ts` contiene comprobaciones puras de política y decisiones conservadoras
para resultados inciertos. `payment-port.ts` define la separación entre política,
preparación, envío y consulta. Todavía no existe implementación real de este puerto ni
conexión a una cola o base de datos. Estas funciones no constituyen una ruta de pago:
la política debe obtenerse de la red esperada justo antes del uso y la evidencia del
resultado debe verificarse antes de actualizar cualquier estado. Ninguna transacción
se prepara, firma o transmite desde el worker actual.

`synthetic-payment.ts` es exclusivamente un doble de prueba en memoria. Sus hashes
con prefijo `synthetic:` no son hashes Stellar ni evidencia de Testnet, y no se
conecta al worker ejecutable. No implementa firma, red, leases ni reconciliación.

`lease.ts` ofrece primitivas de reclamo por tenant con `SKIP LOCKED` y escritura
condicionada al token de lease. Todavía no está conectada al proceso ejecutable ni
al adaptador Stellar; no envía transacciones ni procesa entregas. Los tests de estas
primitivas son unitarios y no prueban contención real ni reinicios con PostgreSQL.
