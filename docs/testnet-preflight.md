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

## Riesgo pendiente de destinatario

`spend(amount)` no incluye el destinatario como argumento firmado y el dueño puede
cambiarlo con `set_policy`. Una consulta fresca antes de enviar no impide un cambio
entre la consulta y la inclusión en ledger. No activar el gate de difusión hasta que
el equipo demuestre una mitigación que vincule la autorización al destinatario o
controle de forma verificable la autoridad de política durante esa ventana.
El verificador de eventos detectaría el desvío después de la ejecución; no lo evita.

El bloqueo es explícito en código: `parseWorkerConfig` rechaza `TESTNET_BROADCAST`
distinto de `disabled`, y el bucle `processTestnetPaymentOnce` solo recibe un RPC de
lectura sin `sendTransaction`.

### Interfaz que necesitará el backend tras la corrección (responsable: Saúl)

- Invocación firmada que incluya el destinatario, por ejemplo
  `spend(amount: i128, recipient: Address)` o `pay(order_ref: BytesN<32>, recipient: Address, amount: i128)`,
  que falle si `recipient != policy.recipient`. Así el árbol de autorización del agente
  fija el destinatario y un `set_policy` posterior no puede desviar el pago.
- Recomendado: `order_ref = sha256(tenant|order)` emitido en un evento propio para
  vincular la evidencia a la orden sin depender solo del hash.
- Cambios backend asociados: `verifySignedSpendEnvelope` y `prepareTestnetDryRun`
  deben validar los nuevos argumentos (y `order_ref`) en la invocación y en la
  autorización; `verifyTestnetTransfer` debe exigir el evento de la orden; y
  solo entonces revisar y habilitar `broadcastStoredTestnet` con autorización humana.

## Matriz de avance

| Caso | Estado |
| --- | --- |
| Preflight y firma con RPC y llaves efímeras simuladas | PASS local |
| XDR cifrado y lease en PostgreSQL 17 | PASS en CI previo; repetir con migración 006 |
| Verificación XDR y evento SEP-41 con datos simulados | PASS local |
| Timeout/NOT_FOUND y reenvío del mismo XDR | PASS unitario con transporte simulado; integración PostgreSQL pendiente de CI |
| Proceso ejecutable `WORKER_MODE=testnet` (sin difusión) y API Testnet | Implementado; integración PostgreSQL en CI (`testnet-db.test.ts`) |
| Confirmación con evidencia verificada (migración 007), `demo-report-provider` y recibo API/MCP/PWA | Implementado con RPC simulado; integración PostgreSQL en CI |
| Confirmación con una transacción Testnet real | BLOCKED: P0 del contrato y difusión deshabilitada |
| RPC real, instancia fondeada y primer broadcast | BLOCKED: faltan infraestructura, secretos seguros y autorización expresa |
| PWA de extremo a extremo contra el backend real | NOT RUN |

`broadcastStoredTestnet` es una función aislada con gate explícito desactivado por
defecto; no está conectada al worker. Incluso si la verificación de política fresca
pasa, el riesgo de cambio de destinatario descrito arriba sigue abierto. No usarla
para transmitir hasta resolver ese riesgo y recibir autorización humana.
