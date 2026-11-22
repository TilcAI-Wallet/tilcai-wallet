# Preflight de compra Testnet: pendiente de habilitación

La ejecución real aún no está implementada y queda deshabilitada. No transmitir,
desplegar ni fondear con el código actual. El pago histórico de #5 no demuestra
que este backend haya procesado una compra; esa instancia agotó su límite.

Para preparar una revisión, el equipo deberá:

1. Crear, con autorización, una instancia Testnet independiente y fondeada. Verificar
   `policy()`, agente, destinatario, activo USDC SAC y límites, y confirmar que tiene
   al menos 5 000 000 unidades mínimas disponibles.
2. Configurar Postgres privado y un login worker asignado al tenant mediante un
   administrador; aplicar migraciones versionadas. No exponer el esquema privado.
3. Provisionar un firmante aislado y una clave AEAD de 32 bytes en almacenes seguros;
   asociar un identificador de clave para recuperación. No escribir secretos ni XDR
   firmado en Git, issues o logs.
4. Revisar el preflight inyectado `prepareAndPersistTestnet`: exige que agente y fee
   payer sean la misma cuenta y rechaza autorizaciones Soroban de dirección o
   delegadas. Revisar hash, límites de ledger, expiración, costo, simulación y
   recuperación cifrada. El código actual no conecta este preflight al worker.
5. Implementar y revisar por separado el envío condicionado a la persistencia, la
   verificación de eventos y la conciliación por el mismo hash. Comprobar que la
   entrega `demo-report-provider` solo se crea tras validar pago y artefacto.
6. Solo después de revisión y autorización expresa del usuario: aprobar un preflight,
   transmitir una única transacción con máximo 0,50 USDC de prueba, verificar hash,
   ledger, activo, origen, destinatario e importe, y comprobar recibo y replay sin
   cargo adicional. Ninguna de estas operaciones se realizó en esta ejecución.

Una observación RPC `SUCCESS` por sí sola no verifica transferencia; `NOT_FOUND` o
un timeout no autorizan un nuevo intento ni la liberación de la retención. Las
pruebas unitarias usan claves efímeras y RPC inyectado; no acreditan una transacción
Testnet ni la seguridad integral de custodia.

## Destinatario y revisión de política (WalletFoundation v2)

El riesgo de destinatario de v1 (`spend(amount)` sin destinatario firmado y modificable con
`set_policy`) queda mitigado por el PR #15: v2 expone `version() == 2`, `policy_state()` y
`spend(amount, recipient, expected_policy_revision)`, que falla con `PolicyChanged` si el
destinatario o la revisión no coinciden con la política vigente. Cada `set_policy` incrementa la revisión.

Integración en el backend:

- Cada tarjeta Testnet guarda en `cards.policy_revision` la revisión que revisó un administrador.
  Sin ella la API no acepta órdenes y el worker no prepara intentos.
- `prepareTestnetDryRun` exige `version() == 2`, lee `policy_state()`, compara la revisión con la
  revisada, valida agente, activo, destinatario, congelación, límites y saldo, y firma exactamente
  `spend(5000000, destinatario, revisión)`. Un cambio de política posterior hace fallar la simulación.
- `verifySignedSpendEnvelope` exige los tres argumentos con sus tipos exactos (`i128`, `Address`,
  `u64`) tanto en la operación como en la autorización Soroban. El contexto AEAD del sobre incluye la revisión.
- La migración 009 registra interfaz y revisión de cada sobre, elimina el punto de entrada v1 y
  `confirm_testnet_payment` solo acepta sobres v2. Un sobre v1 almacenado se informa como
  `legacy_envelope`, no se descifra para uso, no se vuelve a firmar y conserva la retención para revisión manual.
- Si la política cambia entre la firma y la ejecución, la transacción se revierte en red. El worker no
  la confirma, no crea otro intento ni libera la retención automáticamente.

La difusión está deshabilitada por defecto. `broadcastAuthorizedTestnet` (migración 010) solo envía con tres
factores: `TESTNET_BROADCAST=single-authorized`, `TESTNET_BROADCAST_ORDER_ID` y una autorización humana
en `broadcast_authorizations` ligada al hash exacto del sobre, con caducidad y como máximo 3 reenvíos.
Antes de enviar verifica los bytes firmados, la red, los ledgers y el tiempo restantes, la secuencia del
agente y el estado v2 del contrato (revisión, destinatario, agente, activo, límites y saldo). Persiste
`uncertain` antes del envío y concilia por el mismo hash. Solo se ha probado con RPC falso.
Procedimiento: [runbook de la primera compra](testnet-runbook.md).

## Matriz de avance

| Caso | Estado |
| --- | --- |
| Preflight y firma con RPC y llaves efímeras simuladas | PASS local |
| XDR cifrado y lease en PostgreSQL 17 | PASS en CI previo; repetir con migración 006 |
| Verificación XDR y evento SEP-41 con datos simulados | PASS local |
| Timeout/NOT_FOUND y reenvío del mismo XDR | PASS unitario con transporte simulado; integración PostgreSQL pendiente de CI |
| Proceso ejecutable `WORKER_MODE=testnet` (sin difusión) y API Testnet | Implementado; integración PostgreSQL en CI (`testnet-db.test.ts`) |
| Confirmación con evidencia verificada (migración 007), `demo-report-provider` y recibo API/MCP/PWA | Implementado con RPC simulado; integración PostgreSQL en CI |
| Interfaz WalletFoundation v2 en preflight, firma, sobre y conciliación | Implementada; pruebas unitarias y PostgreSQL 17 en CI |
| Envío autorizado de una sola orden (migración 010) con RPC falso: fencing, reintentos, expiración, cambios de política y concurrencia | Implementado; pruebas unitarias y PostgreSQL 17 en CI |
| Confirmación con una transacción Testnet real | NOT RUN: requiere infraestructura, instancia v2 fondeada y autorización humana ([runbook](testnet-runbook.md)) |
| RPC real, instancia fondeada y primer broadcast | BLOCKED: faltan infraestructura, secretos seguros y autorización expresa |
| PWA de extremo a extremo contra el backend real | NOT RUN |

Ninguna prueba transmite: los envíos usan un RPC falso que solo registra los bytes.
