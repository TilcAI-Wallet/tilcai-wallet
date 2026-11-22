# API

`pnpm --filter @tilcai-wallet/api dev` sirve `GET /healthz` en `127.0.0.1:4000`. Usa `API_HOST` y `API_PORT` para el binding local.

- [ ] Agregar sesiones, autenticación y scopes por operación.
- [ ] Crear esquema privado, migraciones de Supabase Postgres y roles mínimos. Verificar RLS y el tenant por objeto.
- [ ] Incorporar intenciones, tarjeta, presupuestos y órdenes.
- [ ] Integrar firmante aislado, pago directo y recibo con evidencia.

[Idempotencia y concurrencia](../../docs/persistence.md) · [Validación](../../docs/validation.md)
