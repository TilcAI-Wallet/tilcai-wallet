# Runbook: primera compra real en Stellar Testnet

Procedimiento para **una única** compra de 0,50 USDC de prueba procesada por el backend
(API → worker → WalletFoundation v2 → Stellar Testnet → conciliación → entrega → recibo).
**La compra no se ha ejecutado.** Hasta ahora solo se verificó la instancia del contrato en solo lectura
(sección 1). No usar en Mainnet ni con fondos reales.

## Reglas

- Una sola orden, un solo sobre firmado y un solo hash. El worker nunca vuelve a firmar una orden.
  Solo reenvía los mismos bytes (como máximo `max_sends`, 3 por defecto) mientras la red responda `NOT_FOUND`.
- La difusión está deshabilitada por defecto. Hacen falta tres factores a la vez:
  1. `TESTNET_BROADCAST=single-authorized`. Cualquier otro valor distinto de `disabled` impide arrancar.
  2. `TESTNET_BROADCAST_ORDER_ID=<orden>`.
  3. Una fila en `broadcast_authorizations`. Solo un administrador puede crearla, ligada al hash exacto del sobre almacenado y con caducidad.
- Dos personas: un **operador** ejecuta y un **aprobador** revisa el preflight y autoriza el hash.
- Si algo no coincide con lo esperado, detenerse. Ningún paso automático libera la retención ni crea otro cargo.
- Nunca escribir en Git, issues, chats ni logs semillas, contraseñas, tokens, URLs con credenciales ni XDR firmado.

## 1. Instancia WalletFoundation v2 verificada

Datos públicos de la instancia desplegada por el responsable del contrato:

| Campo | Valor |
| --- | --- |
| Contrato | `CCLONQVFVRZ3EXR76R4WTFVQ77UM4IJW2MU4BB5S2RQ3PNRGI4VRFUIA` |
| Wasm desplegado (SHA-256) | `43853af7d2465d701c2744eb74031830d7d592d005d73d36e3682457482cf645` |
| Despliegue | Subida del Wasm `67b6b95c2ddf91988b72426638a30178e7035107e40008933da5d90ae857a9cd` (ledger 5871254); creación `8e6f3492877c8c8ff37548218d42ae109c2f7d23afd6a23ffd954415422dbb74` (ledger 5871255) |
| Owner | `GAFWOEXSFUXQMTMJG5VZEOMMSABYX4NRA3GTUCEF3CQCZW4XPVPQ6LWW` |
| Agente | `GBJA2MS5XC52VBLDARCDO333LEPCCU7OSTYXUCOQXKYFE66IDRDJ3LT2` |
| Destinatario | `GAGK4SEOVSZDQXSBMO6KMUHNH36B3E2AZFDINVDFVRVV2ZYLP577OSHX` |
| Activo | USDC SAC `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` |
| `max_per_payment` / `limit` / `spent` | 5000000 / 5000000 / 0 |
| Revisión de política | 0 (no hay `PolicyRevision` almacenada; el contrato devuelve 0) |
| Saldo USDC del contrato | 5000000 (0,50 USDC exactos: alcanza para una sola compra) |

Verificación de solo lectura, sin claves ni dependencias:

```sh
python3 -I infra/testnet/verify_walletfoundation.py
```

Solo usa `getNetwork`, `getLatestLedger` y `getLedgerEntries` del RPC y lecturas de cuentas de Horizon. No firma, no simula y no envía nada.
Comprueba lo siguiente:
- política, revisión, congelación, límites y saldo;
- el TTL de la instancia y del código;
- la interfaz v2 en la especificación del Wasm (`version`, `policy_state`, `spend` con `recipient` y `expected_policy_revision`, `PolicyChanged`);
- que el agente tenga XLM para comisiones y un único firmante;
- la línea de confianza USDC del destinatario.

El 22/11/2026 (ledger 5871555) dio **28/28 PASS**. Los parámetros se pueden cambiar (`--help`) y
`--expected-wasm-hash` exige un hash concreto. Hay que repetirlo inmediatamente antes de la sección 4.

**Pendientes antes de autorizar el envío:**
- **Procedencia del Wasm.** El único hash de compilación registrado en `contracts/soroban/testnet-v2-preparacion.md` es `f730f1f1…` (compilación preliminar con CLI 28.1.0) y no coincide con el desplegado. El responsable del contrato debe registrar el commit, la versión de la CLI y el artefacto que producen `43853af7…`, o recompilar de forma reproducible con la CLI 30.0.1. Después, ejecutar el verificador con `--expected-wasm-hash`.
- **Custodia del agente.** Hay que decidir quién guarda la semilla de `GBJA2…`, cómo llega al host del worker (canal seguro y archivo `0600`) y quién conserva la clave del dueño. Que el dueño y el agente los controle la misma persona no queda resuelto con la verificación.
- **Vigencia.** La instancia y el código siguen vigentes hasta el ledger ~5992214 (aprox. 29/11/2026). Después, el dueño debe extender el TTL; mientras tanto el preflight falla de forma segura.

## 2. PostgreSQL privado (Supabase)

Supabase (plan gratuito) es **compatible con ajustes**. Su rol `postgres` **no es superusuario**: tiene `CREATEROLE` pero no `CREATEDB`
ni privilegios de superusuario, y `ALTER ROLE … NOSUPERUSER` falla. Por eso:

| Requisito del repositorio | En Supabase | Acción |
| --- | --- | --- |
| `bootstrap-roles.sql` (crea `wallet_migrator`, `wallet_api` y `wallet_worker` con `NOLOGIN NOINHERIT … NOBYPASSRLS`) | Probable: `CREATE ROLE` con atributos `NO…` no requiere superusuario. Sí lo requeriría `ALTER ROLE` | Ejecutar como `postgres` y confirmar después en `pg_roles` que no hay `rolsuper`, `rolbypassrls`, `rolcanlogin` ni `rolinherit` |
| `GRANT CREATE ON DATABASE … TO wallet_migrator` (en el mismo script) | Depende de quién sea el dueño de la base (`postgres` o `supabase_admin`) | Si falla: `GRANT wallet_migrator TO postgres;` y `CREATE SCHEMA wallet_private AUTHORIZATION wallet_migrator;` antes de migrar |
| `SET ROLE wallet_migrator` del administrador | Desde PG16 el creador recibe ADMIN, pero no `SET` | `GRANT wallet_migrator TO postgres;` para las consultas administrativas de este runbook |
| Tres logins dedicados | Se pueden crear roles con `LOGIN PASSWORD` | Ver el paso 3 |
| `migrate.sh` y `bootstrap-roles.sql` usan `psql` (`\i`, `\gset`, `\gexec`) | El editor SQL de Supabase no ejecuta metacomandos | Ejecutarlos con `psql` 17 desde un host del equipo, no desde el PC personal |
| `test-db.sh` e `isolation.sql` | Requieren superusuario y una base desechable | **No** ejecutarlos en Supabase; ya pasan en CI con PostgreSQL 17 |
| `worker_assignments.login_name = session_user` | Pooler de sesión (Supavisor, puerto 5432): el usuario es `rol.<project-ref>` y no hay documentación sobre `session_user` | Comprobar antes de asignar: `SELECT session_user, current_user;` con la URL del worker debe devolver `tilcai_worker` |
| Conexión directa | `db.<ref>.supabase.co` solo es IPv6 en el plan gratuito | Usar el pooler de sesión (IPv4); nunca el de transacción (6543) para el worker |
| TLS `sslmode=verify-full` (API y worker lo exigen en hosts remotos) | La CA raíz de Supabase (Root 2021, `prod-ca-2021.crt`) no está en el almacén de Node | Descargarla en *Database Settings → SSL*, verificar la huella y añadir `sslrootcert=<ruta>` a cada URL. Activar *SSL enforcement* |
| Esquema privado | La Data API expone `public` y `graphql_public` | No añadir `wallet_private` a los esquemas expuestos. `anon`, `authenticated` y `service_role` no reciben permisos |
| Versión | Los proyectos nuevos usan PostgreSQL 15 o 17 | Preferir 17 (la versión probada en CI) y comprobarlo con `SHOW server_version` |

Alternativa sin estas restricciones: PostgreSQL 17 autogestionado con superusuario, en un host privado con TLS.

Procedimiento (administrador, con `psql` 17 y la URL del pooler de sesión como `postgres`; no ejecutado todavía):

1. Crear un proyecto Supabase en una región cercana, con PostgreSQL 17, *SSL enforcement* y restricciones de red a las IP del equipo si es posible.
2. `psql "<URL-admin>" -v ON_ERROR_STOP=1 -f infra/postgres/bootstrap-roles.sql`. Si falla el `GRANT CREATE ON DATABASE`, aplicar la alternativa de la tabla.
3. Logins (contraseñas generadas y guardadas en un gestor de secretos):
   ```sql
   GRANT wallet_migrator TO postgres;
   CREATE ROLE tilcai_migrator LOGIN PASSWORD '<secreto>' NOINHERIT; GRANT wallet_migrator TO tilcai_migrator;
   CREATE ROLE tilcai_api      LOGIN PASSWORD '<secreto>' INHERIT;   GRANT wallet_api      TO tilcai_api;
   CREATE ROLE tilcai_worker   LOGIN PASSWORD '<secreto>' INHERIT;   GRANT wallet_worker   TO tilcai_worker;
   SELECT rolname, rolsuper, rolbypassrls, rolinherit, rolcanlogin FROM pg_roles WHERE rolname LIKE 'wallet\_%' OR rolname LIKE 'tilcai\_%';
   ```
   El worker se niega a arrancar si su login es superusuario, tiene `BYPASSRLS`, es miembro de `wallet_migrator` o no hereda `wallet_worker`.
4. `WALLET_MIGRATION_DATABASE_URL="<URL tilcai_migrator>" bash infra/postgres/migrate.sh` aplica las migraciones 001–010.
   Repetirlo no debe aplicar nada nuevo: las sumas de verificación tienen que coincidir.
5. Con la URL de `tilcai_worker`: `SELECT session_user, current_user, pg_has_role('wallet_worker','USAGE');` debe devolver `tilcai_worker`, `tilcai_worker` y `true`.
   Si `session_user` no es el login, **no continuar**: las funciones del worker deniegan el acceso por diseño.

## 3. Datos de la prueba, secretos y servicios (sin órdenes)

Generar fuera de Git un token aleatorio de 32 a 256 caracteres `[A-Za-z0-9_-]` y calcular su SHA-256. Solo el hash entra en la base.
Alta (administrador, una transacción):

```sql
BEGIN;
SET LOCAL ROLE wallet_migrator;
SELECT set_config('wallet.tenant_id', 'tilcai-testnet-1', true);
INSERT INTO wallet_private.tenants(tenant_id) VALUES ('tilcai-testnet-1');
INSERT INTO wallet_private.sessions(tenant_id,network,session_id,actor_id,expires_at,agent_name,display_name)
  VALUES ('tilcai-testnet-1','testnet','sesion-1','operador',now()+interval '7 days','Agente Testnet','Prueba v2');
INSERT INTO wallet_private.credentials(tenant_id,network,session_id,token_hash,scopes,expires_at)
  VALUES ('tilcai-testnet-1','testnet','sesion-1',decode('<sha256-hex-del-token>','hex'),
          ARRAY['sessions:read','cards:read','orders:write','orders:read','receipts:read'],now()+interval '7 days');
INSERT INTO wallet_private.cards(tenant_id,network,card_id,session_id,contract_id,asset_id,recipient,agent,mode,
    balance_minor,payment_limit_minor,total_limit_minor,spent_minor,policy_revision,display_name)
  VALUES ('tilcai-testnet-1','testnet','tarjeta-v2','sesion-1',
          'CCLONQVFVRZ3EXR76R4WTFVQ77UM4IJW2MU4BB5S2RQ3PNRGI4VRFUIA','CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
          'GAGK4SEOVSZDQXSBMO6KMUHNH36B3E2AZFDINVDFVRVV2ZYLP577OSHX','GBJA2MS5XC52VBLDARCDO333LEPCCU7OSTYXUCOQXKYFE66IDRDJ3LT2',
          'testnet',5000000,5000000,5000000,0,0,'Tarjeta v2 Testnet');
INSERT INTO wallet_private.worker_assignments(login_name,tenant_id) VALUES ('tilcai_worker','tilcai-testnet-1');
COMMIT;
```

Secretos en el host del worker (Linux o WSL: en Windows no se comprueban los permisos del archivo):

- **Clave AEAD:** `umask 077; openssl rand -base64 32 > <ruta-segura>/envelope.key` y un `ENVELOPE_KEY_ID` estable
  (por ejemplo `testnet-2026-11`). Guardar una copia en el gestor de secretos del equipo: sin ella, el sobre almacenado no se puede descifrar.
- **Firmante del agente:** la semilla de `GBJA2…` en un archivo `0600` (`AGENT_SIGNER_SECRET_FILE`), entregada según la decisión de
  custodia de la sección 1. El worker la compara con `cards.agent` antes de firmar.

Servicios, con la difusión **deshabilitada**:

- **API:** `WALLET_API_DATABASE_URL="<URL tilcai_api>?sslmode=verify-full&sslrootcert=<ruta>" API_HOST=127.0.0.1 API_PORT=4000 pnpm --filter @tilcai-wallet/api start`.
  Comprobar con el token: `GET /healthz`, `GET /v1/sessions/sesion-1` y `GET /v1/cards/tarjeta-v2`
  (`mode = testnet`, `accountAddress` igual al contrato y `availableMinor = 5000000`).
- **Worker:** `WORKER_MODE=testnet`, `WORKER_DATABASE_URL` (login `tilcai_worker`, `sslmode=verify-full`, `sslrootcert`),
  `STELLAR_RPC_URL=https://soroban-testnet.stellar.org`, `ENVELOPE_KEY_ID`, `ENVELOPE_KEY_FILE`, **sin** `TESTNET_BROADCAST`
  ni `TESTNET_BROADCAST_ORDER_ID`, y sin `AGENT_SIGNER_SECRET_FILE` hasta la sección 4.
  Primero `pnpm --filter @tilcai-wallet/worker check`, después `start`. Sin órdenes, el bucle no tiene trabajo.

## 4. Preflight (sin difusión)

1. Mantener el worker detenido (`WORKER_MODE=disabled`).
2. Crear la orden por la API (o con la herramienta MCP `create_order`) con una `Idempotency-Key` nueva y guardar `orderId` y `receiptId`.
   El recibo debe mostrar `payment.status = "not_submitted"`.
3. Repetir el verificador de la sección 1. Todo debe pasar y la revisión `R` debe seguir siendo la registrada en la tarjeta (0 para esta instancia).
4. **Solo con la autorización expresa del responsable de la prueba**, arrancar el worker con
   la configuración de la sección 3 más `AGENT_SIGNER_SECRET_FILE`,
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

## 5. Autorización humana

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

## 6. Envío y conciliación

En la siguiente iteración, el worker hace lo siguiente:
1. Verifica los bytes del sobre, la red, los ledgers y el tiempo restantes (con margen), la secuencia del agente y el estado actual del contrato.
2. Renueva el lease y consume la autorización. Así el estado `uncertain` queda persistido antes del envío.
3. Envía los mismos bytes. El log muestra `Testnet payment step: submitted`.
4. Concilia por el mismo hash. Con un evento de transferencia verificado, el log muestra `confirmed` y después `Demo delivery step: delivered`.

## 7. Evidencias que se deben registrar

- Hash y enlace `https://stellar.expert/explorer/testnet/tx/<tx_hash>`, ledger e importe.
- Un único evento `transfer` del activo USDC SAC, desde el contrato hacia el destinatario, por `5000000`.
- `policy_state()` después del pago: `spent` aumentó en 5 000 000 y la revisión sigue en `R`. Balance del contrato reducido en 0,50.
- Fila en `payment_evidence` (hash, ledger, activo, origen, destinatario, importe y digest del sobre) y `send_count` en `broadcast_authorizations`.
- Recibo `GET /v1/receipts/<receiptId>` con `payment.status = "confirmed"` y el mismo hash y ledger. Debe coincidir en API, MCP (`get_receipt`) y PWA.
- Entrega `delivered` con `providerId`, `evidenceId` y `digest`.
- Replay: repetir el `POST /v1/orders` con la misma clave devuelve la misma orden (200). Con una clave nueva, una tarjeta con límite total de 0,50 rechaza la orden (409) y no hay segundo cargo.

## 8. Desactivación

1. Detener el worker y volver a `TESTNET_BROADCAST=disabled` sin `TESTNET_BROADCAST_ORDER_ID`.
2. Revocar la autorización (`UPDATE wallet_private.broadcast_authorizations SET revoked_at = now() WHERE tx_hash = '<tx_hash>'` como `wallet_migrator` con el tenant fijado).
3. Archivar las evidencias en la issue #6 sin secretos, XDR firmado ni URLs con credenciales.

## 9. Recuperación ante errores

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
