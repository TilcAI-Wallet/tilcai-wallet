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

No existe un proceso ejecutable que coordine el envío y la conciliación, ni
proveedor real de entrega. Las tarjetas `testnet` no están habilitadas en la API;
no ejecutar contra fondos ni configurar un piloto con estas piezas. Ver
[preflight y límites](../../docs/testnet-preflight.md).

La biblioteca `testnet-broadcast.ts` puede invocar un RPC inyectado solo con gate
explícito y recuperación cifrada, lease y verificación de política. **No está
conectada al proceso ejecutable ni autorizada para uso real**. Una comprobación de
política antes de enviar no elimina el riesgo de que el dueño cambie `recipient`
con `set_policy` antes de la inclusión: `spend(amount)` no fija el destinatario en
la operación firmada. Este riesgo sigue abierto y debe resolverse antes de activar
transmisiones. Las pruebas pasan un transporte falso y no acceden a una red.

## Modo Testnet ejecutable (difusión bloqueada)

`WORKER_MODE=testnet` requiere `STELLAR_RPC_URL` HTTPS, `ENVELOPE_KEY_ID` y
`ENVELOPE_KEY_FILE` (32 bytes en base64, permisos 0600). `AGENT_SIGNER_SECRET_FILE`
es opcional: sin él solo se concilian sobres ya preparados. `TESTNET_BROADCAST` solo
acepta `disabled`. Cada iteración reclama con lease, prepara una única vez, recupera
el mismo sobre cifrado tras reinicios, consulta el hash (solo lectura) y confirma
mediante `confirm_testnet_payment` únicamente con un evento SEP-41 verificado.
Timeout, `NOT_FOUND` o eventos no coincidentes conservan intento y retención. Tras la
confirmación, `demo-report-provider` entrega un artefacto cuyo digest y vínculo con
la orden y el pago se verifican de forma independiente antes de registrarlo.

`testnet-controlled.ts` conecta preflight/vault, lease y `uncertain` exclusivamente
con `SimulatedTransport`, que no tiene capacidad de red. Las observaciones de ese
transporte no se guardan como evidencia Testnet. El verificador SEP-41 comprueba
el sobre exacto y el evento de transferencia, suponiendo un RPC confiable; aún no
se ha conectado a una transición de pago confirmado ni al proveedor de entrega.
