# ADR 003 · PostgreSQL en Supabase para la wallet

**Estado** Decisión de arquitectura para la primera entrega en Testnet. Provisionamiento, migraciones y pruebas de integración pendientes.

## Decisión

Usar **Supabase Postgres** para el estado operativo de la wallet desde la primera compra integrada. `services/api` y `services/worker` pueden escribir desde procesos separados y necesitan transacciones, restricciones y coordinación de concurrencia. Mantener las migraciones versionadas en el monorepo cuando se implemente el esquema. Los procesos locales pueden levantar la base de pruebas de forma reproducible.

Los canales siguen usando **Fastify y `wallet-sdk`**. API, worker y migraciones usan roles separados. La conexión de servicio usa TLS y un pool acotado. Elegir conexión directa o pool en modo sesión según la red y el entorno del proceso. La API sigue gestionando passkeys, sesiones y OAuth de la wallet. El uso de Supabase para la base de datos es independiente de Supabase Auth y Realtime.

## Límites

| Componente | Responsabilidad |
| --- | --- |
| Stellar y Soroban | Saldo, transferencias, contador y política de gasto efectiva, revocaciones confirmadas. |
| Supabase Postgres | Identidades y sesiones operativas, tarjetas, órdenes, intentos, proyecciones, recibos, idempotencia, outbox, inbox y cursores. Las tablas operativas viven en esquema privado. |
| Supabase Storage | Bucket privado para entregables que TilcAI deba conservar. Postgres guarda el digest, la referencia y la autorización de acceso. La API valida el tenant y emite acceso de corta duración. Las copias de objetos se prueban por separado. |
| Firmante y relayer | Custodia y uso de llaves de firma y patrocinio en su frontera dedicada. En Postgres quedan claves públicas y referencias operativas. |

## Consecuencias

- Coordinar la orden, el intento y el evento de outbox en una misma transacción. Una retención de la aplicación modifica la proyección del disponible. La política efectiva depende del ledger.
- Mantener las tablas de wallet fuera de la Data API. Usar roles de ejecución sin propiedad ni bypass de RLS, grants mínimos y contexto de tenant por transacción. Probar aislamiento desde API y worker.
- Separar local, Testnet y producción. Verificar región, retención, copias, restauración y costos antes de elegir el plan para datos reales. El respaldo de Postgres no incluye el contenido de los objetos de Storage.

[Diseño de datos y concurrencia](../persistence.md) · [Validación](../validation.md) · [Conexión a Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres) · [Protección de datos](https://supabase.com/docs/guides/database/secure-data) · [Backups](https://supabase.com/docs/guides/platform/backups)
