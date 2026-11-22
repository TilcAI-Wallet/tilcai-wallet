# API

`pnpm --filter @tilcai-wallet/api dev` sirve `GET /healthz` en `127.0.0.1:4000`. Usa `API_HOST` y `API_PORT` para el binding local.

- [ ] Agregar sesiones, autenticación y scopes por operación.
- [ ] Crear esquema privado, migraciones de Supabase Postgres y roles mínimos. Verificar RLS y el tenant por objeto.
- [ ] Incorporar intenciones, tarjeta, presupuestos y órdenes.
- [ ] Integrar firmante aislado, pago directo y recibo con evidencia.

[Idempotencia y concurrencia](../../docs/persistence.md) · [Validación](../../docs/validation.md)

## Órdenes en modo fixture (en desarrollo)

Configura `WALLET_API_DATABASE_URL` mediante un secreto local con el rol de API. Las
rutas v1 exigen un Bearer opaco aleatorio cuyo SHA-256, sesión, scopes, caducidad y
revocación estén registrados por un administrador. La API solo expone saldos
`fixture` y recibos pendientes; no confirma pagos ni emite recibos verificados. La tabla y la función de
verificación requieren la migración 003. La implementación y el aislamiento todavía
necesitan pruebas de integración PostgreSQL 17 antes de cualquier uso real.
