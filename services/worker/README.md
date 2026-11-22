# Worker de prueba

`pnpm --filter @tilcai-wallet/worker check` valida la configuración y sale. El
proceso está deshabilitado por defecto; `WORKER_MODE=fixture` y una conexión privada
`WORKER_DATABASE_URL` permiten ejecutar `pnpm --filter @tilcai-wallet/worker start`.
El login de conexión debe tener el rol `wallet_worker` y un administrador debe
asignarlo a los tenants permitidos en `wallet_private.worker_assignments`. No se
acepta un tenant por variables de entorno ni se concede lectura directa de la cola.
El Session pooler debe conservar `session_user`; conexiones remotas requieren TLS
con `sslmode=verify-full`.

El worker de fixture guarda su carga sintética en PostgreSQL, deduplica su envío
simulado, recupera tras caducidad del lease y confirma el recibo como `mode: fixture`.
No llama a Stellar, no firma, no usa `PaymentPort` ni constituye evidencia de red.
La entrega queda pendiente. La implementación real necesita almacenamiento privado
resoluble de sobres, firmante autorizado, comprobación de política y saldo RPC,
conciliación por hash y el proveedor de prueba. No se habilita Testnet real.

`RECONCILE_INTERVAL_MS` (250–60000) y `WORKER_LEASE_SECONDS` (1–300) acotan el
sondeo y la duración del lease. No se deben registrar URLs, credenciales ni sobres.
