# Runbook: primera compra real en Stellar Testnet

Procedimiento para **una única** compra de 0,50 USDC de prueba procesada por el backend
(API → worker → WalletFoundation v2 → Stellar Testnet → conciliación → entrega → recibo).
Nada de esto se ha ejecutado todavía. No usar en Mainnet ni con fondos reales.

## Reglas

- Una sola orden, un solo sobre firmado y un solo hash. El worker nunca vuelve a firmar una orden.
  Solo reenvía los mismos bytes (como máximo `max_sends`, 3 por defecto) mientras la red responda `NOT_FOUND`.
- La difusión está deshabilitada por defecto. Hacen falta tres factores a la vez:
  1. `TESTNET_BROADCAST=single-authorized`. Cualquier otro valor distinto de `disabled` impide arrancar.
  2. `TESTNET_BROADCAST_ORDER_ID=<orden>`.
  3. Una fila en `broadcast_authorizations`. Solo un administrador puede crearla, ligada al hash exacto del sobre almacenado y con caducidad.
- Dos personas: un **operador** ejecuta y un **aprobador** revisa el preflight y autoriza el hash.
- Si algo no coincide con lo esperado, detenerse. Ningún paso automático libera la retención ni crea otro cargo.

## 1. Requisitos previos

| Elemento | Responsable | Comprobación |
| --- | --- | --- |
| Instancia **nueva** de WalletFoundation v2 en Testnet, fondeada con al menos 0,50 USDC de prueba | Dueño del contrato | `version()` devuelve `2` y `policy_state()` devuelve agente, activo USDC SAC `CBIELTK6…DAMA`, destinatario `GAGK4SEO…OSHX`, `max_per_payment ≥ 5000000`, `limit - spent ≥ 5000000`, `frozen = false` y una revisión `R` |
| PostgreSQL o Supabase privado con migraciones 001–010 | Administrador | `migrate.sh` sin errores y `test-db.sh` aplicado antes en una base desechable |
| Login del worker con `wallet_worker`, asignado solo al tenant de la prueba | Administrador | Fila en `wallet_private.worker_assignments` |
| Login de la API con `wallet_api` y una credencial con `orders:write`, `orders:read` y `receipts:read` | Administrador | `GET /v1/cards/<tarjeta>` responde 200 |
| Tarjeta `mode='testnet'` con `contract_id`, `agent`, `recipient`, `asset_id`, límites, y `policy_revision = R` | Administrador | Coincide con `policy_state()` |
| RPC HTTPS de Testnet de confianza | Operador | `getNetwork` devuelve `Test SDF Network ; September 2015` |
| Clave AEAD de 32 bytes (`ENVELOPE_KEY_FILE`, permisos 0600) e `ENVELOPE_KEY_ID` | Operador | Fuera del repositorio |
| Secreto del agente (`AGENT_SIGNER_SECRET_FILE`, permisos 0600), igual al `agent` de la política | Operador | Su clave pública coincide con `policy_state().agent` |

Consultas de solo lectura del contrato (no envían nada):

```sh
stellar contract invoke --network testnet --source wallet-owner --id "$CONTRACT" --send no -- version
stellar contract invoke --network testnet --source wallet-owner --id "$CONTRACT" --send no -- policy_state
stellar contract invoke --network testnet --source wallet-owner --id "$USDC" --send no -- balance --id "$CONTRACT"
```

## 2. Preflight (sin difusión)

1. Mantener el worker detenido (`WORKER_MODE=disabled`).
2. Crear la orden por la API (o con la herramienta MCP `create_order`) con una `Idempotency-Key` nueva y guardar `orderId` y `receiptId`.
   El recibo debe mostrar `payment.status = "not_submitted"`.
3. Volver a consultar `version()` y `policy_state()`. La revisión debe seguir siendo `R`.
4. Arrancar el worker con:
   `WORKER_MODE=testnet`, `STELLAR_RPC_URL`, `ENVELOPE_KEY_ID`, `ENVELOPE_KEY_FILE`, `AGENT_SIGNER_SECRET_FILE`,
   `TESTNET_BROADCAST=single-authorized` y `TESTNET_BROADCAST_ORDER_ID=<orderId>`.
   El worker simula y firma una vez `spend(5000000, destinatario, R)` y guarda el sobre cifrado.
   Al no haber autorización, el log muestra `Testnet payment step: awaiting_authorization`.
5. Desde ese momento el sobre vale unos 10 minutos (120 ledgers o 600 s, lo que ocurra antes) y la
   autorización debe llegar dentro de ese plazo. Si caduca, ver la sección de recuperación.

Obtener el hash para el aprobador (administrador, en una transacción):

```sql
BEGIN;
SET LOCAL ROLE wallet_migrator;
SELECT set_config('wallet.tenant_id', '<tenant>', true);
SELECT a.order_id, a.attempt_id, a.state, a.tx_hash, a.valid_through_ledger, e.spend_interface, e.policy_revision
  FROM wallet_private.attempts a JOIN wallet_private.encrypted_envelopes e USING (tenant_id, network, attempt_id)
 WHERE a.order_id = '<orderId>';
COMMIT;
```

Esperado: un único intento con `state = 'prepared'`, `spend_interface = 2`, `policy_revision = R` y un `tx_hash` de 64 caracteres hexadecimales.

## 3. Autorización humana

El aprobador comprueba lo siguiente:
- La orden es la acordada y su importe es 5 000 000.
- La tarjeta y el contrato son los de la prueba.
- `policy_state()` sigue en la revisión `R`.
- El hash coincide con el de la consulta anterior.

Después autoriza **ese hash**:

```sql
BEGIN;
SET LOCAL ROLE wallet_migrator;
SELECT wallet_private.authorize_testnet_broadcast('<tenant>', '<orderId>', '<tx_hash>',
  '<nombre del aprobador>', '<motivo y referencia de la issue>', 15);
COMMIT;
```

La función rechaza la autorización en estos casos:
- el hash no es el del sobre v2 almacenado;
- la orden no está pendiente, no es de 0,50 USDC o no es Testnet;
- la revisión del sobre no es la de la tarjeta;
- la orden ya estaba autorizada.

Los roles de ejecución no pueden ejecutar esta función ni leer la tabla.

## 4. Envío y conciliación

En la siguiente iteración, el worker hace lo siguiente:
1. Verifica los bytes del sobre, la red, los ledgers y el tiempo restantes (con margen), la secuencia del agente y el estado actual del contrato.
2. Renueva el lease y consume la autorización. Así el estado `uncertain` queda persistido antes del envío.
3. Envía los mismos bytes. El log muestra `Testnet payment step: submitted`.
4. Concilia por el mismo hash. Con un evento de transferencia verificado, el log muestra `confirmed` y después `Demo delivery step: delivered`.

## 5. Evidencias que se deben registrar

- Hash y enlace `https://stellar.expert/explorer/testnet/tx/<tx_hash>`, ledger e importe.
- Un único evento `transfer` del activo USDC SAC, desde el contrato hacia el destinatario, por `5000000`.
- `policy_state()` después del pago: `spent` aumentó en 5 000 000 y la revisión sigue en `R`. Balance del contrato reducido en 0,50.
- Fila en `payment_evidence` (hash, ledger, activo, origen, destinatario, importe y digest del sobre) y `send_count` en `broadcast_authorizations`.
- Recibo `GET /v1/receipts/<receiptId>` con `payment.status = "confirmed"` y el mismo hash y ledger. Debe coincidir en API, MCP (`get_receipt`) y PWA.
- Entrega `delivered` con `providerId`, `evidenceId` y `digest`.
- Replay: repetir el `POST /v1/orders` con la misma clave devuelve la misma orden (200). Con una clave nueva, una tarjeta con límite total de 0,50 rechaza la orden (409) y no hay segundo cargo.

## 6. Desactivación

1. Detener el worker y volver a `TESTNET_BROADCAST=disabled` sin `TESTNET_BROADCAST_ORDER_ID`.
2. Revocar la autorización (`UPDATE wallet_private.broadcast_authorizations SET revoked_at = now() WHERE tx_hash = '<tx_hash>'` como `wallet_migrator` con el tenant fijado).
3. Archivar las evidencias en la issue #6 sin secretos, XDR firmado ni URLs con credenciales.

## 7. Recuperación ante errores

| Paso del worker o síntoma | Significado | Acción |
| --- | --- | --- |
| `awaiting_authorization` | No hay autorización válida: falta, caducó, se revocó o se agotó `max_sends` | Autorizar dentro de la validez del sobre, o detener la prueba |
| `broadcast_blocked` | La política, el contrato, el saldo o la red no coinciden con lo firmado | No reautorizar. Revisar `policy_state()`: un cambio de revisión invalida el sobre de forma definitiva |
| `envelope_expired` | El sobre ya no puede incluirse | No hay reenvío ni nueva firma. La orden queda pendiente con su retención (ver limitación) |
| `submitted` repetido con `NOT_FOUND` | Respuesta perdida o la red aún no lo ve | El worker reenvía los mismos bytes como máximo `max_sends` veces. No hay segundo cargo posible con el mismo hash y la misma secuencia |
| `awaiting_evidence` | Timeout del RPC o transacción `FAILED` (por ejemplo `PolicyChanged`) | No se reenvía. Revisar el hash en el explorador. Si es `FAILED`, el pago no ocurrió |
| `evidence_rejected` | El evento no coincide con la orden | Detener y revisar. No se confirma ni se libera nada |
| `legacy_envelope` | Sobre firmado para la interfaz v1 | Revisión manual. Nunca se vuelve a firmar automáticamente |
| Caída o reinicio del worker | — | Reiniciar: recupera el mismo sobre cifrado y el mismo hash |

**Limitación conocida:** no existe todavía un procedimiento soportado para cerrar una orden cuyo sobre
caducó o falló. Habría que marcar el intento como expirado o fallido y liberar la retención, con prueba de no inclusión. Si ocurre,
la orden queda `payment_pending` con la retención activa. No hay pérdida de fondos, pero hace falta una
decisión y un cambio revisado antes de reintentar con otra orden.
