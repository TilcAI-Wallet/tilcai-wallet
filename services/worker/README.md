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

## Preflight Testnet aislado

`prepareTestnetDryRun` consulta política y saldo mediante RPC inyectado, exige la
passphrase Testnet, el agente como source y fee payer, USDC y destinatario fijados,
y simula `spend(5000000)`. Solo acepta autorización Soroban por source account;
autorizaciones de dirección/delegadas y restauración se rechazan. El firmante
inyectado firma el hash sin exportar su clave. El resultado es un sobre firmado:
trátalo como sensible y no lo imprimas. No se realiza difusión.

`prepareAndPersistTestnet` cifra el sobre con AES-256-GCM y lo guarda en PostgreSQL
junto al intento bajo el lease vigente. La clave de 32 bytes se inyecta desde un
almacén externo; no está en la base ni se configura automáticamente. Al recuperar,
`loadTestnetEnvelope` valida AEAD, metadatos, hash de red y digest de todos los bytes
XDR. Esta ruta es una biblioteca aislada: **no está conectada al worker ejecutable**.
`observeTestnetHash` consulta RPC, conserva `NOT_FOUND` y timeout como inciertos y
no considera `SUCCESS` evidencia suficiente de pago.

No existe implementación de envío, ni verificador de eventos de transferencia, ni
proveedor real de entrega. Las tarjetas `testnet` no están habilitadas en la API;
no ejecutar contra fondos ni configurar un piloto con estas piezas. Ver
[preflight y límites](../../docs/testnet-preflight.md).
