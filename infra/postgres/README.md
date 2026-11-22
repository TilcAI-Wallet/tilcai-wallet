# Persistencia de compra (en construcción)

Esta infraestructura aún no está conectada a la API ni al worker. No aplicarla en
Supabase ni considerar verificada su seguridad antes de ejecutar y revisar las pruebas.

En una base nueva, un administrador ejecuta `bootstrap-roles.sql` mediante `psql`.
Crea tres roles sin login ni BYPASSRLS; el administrador debe asignarlos explícitamente
a los logins dedicados y manejar sus credenciales fuera del repositorio. El login de
migración debe poder asumir `wallet_migrator`. Ejecutar después `migrate.sh` con
`WALLET_MIGRATION_DATABASE_URL` configurada explícitamente: bloquea la ejecución
concurrente, aplica archivos numerados en una transacción y guarda sus checksums;
un archivo aplicado que cambie se rechaza. No ejecuta migraciones remotas por defecto.

API y worker deben verificar identidad y autorización antes de usar `set_config` con
el tercer argumento `true` dentro de cada transacción. Un rol SQL que puede ejecutar
consultas arbitrarias puede cambiar ese contexto; RLS no autentica a un usuario y no
protege contra SQL arbitrario con el mismo rol. No se concede acceso a credenciales ni
reclamación global de outbox: faltan el verificador de credenciales y un mecanismo de
reclamación con lease y fencing. No se ha implementado idempotencia transaccional de
la API. Conectar a Supabase solo mediante una URL privada con TLS y un Session pooler;
no exponer este esquema mediante Data API ni usar service_role en clientes.

Para una base **desechable** PostgreSQL 17, con `psql` y un superusuario de prueba,
`WALLET_TEST_DATABASE_URL=... bash infra/postgres/test-db.sh` crea roles, aplica las
migraciones dos veces y prueba parte de RLS y permisos. No apuntar a un entorno
compartido. La suite incluye comprobaciones de rollback y limpieza de contexto, aún no ejecutadas
localmente. Faltan pruebas de carreras de orden, lease/fencing y de la respuesta HTTP
409; no se afirma que estén implementadas.

La migración 005 incorpora sobres Testnet cifrados, una sola fila por intento,
restricción de nonce por clave y funciones que verifican `session_user` asignado y
lease vigente. El rol de API y el worker no tienen acceso directo a la tabla; el
worker accede solo mediante las funciones. La clave AEAD nunca se almacena en la
base. `wallet.tenant_id` por sí solo no autentica: la conexión y el código del
servicio siguen formando parte de la frontera de confianza. La API aún no habilita
órdenes Testnet y no existe un mecanismo de difusión.

La migración 006 añade lectura del intento y transición a `uncertain` para un login
worker asignado que posea un lease vigente. La operación conserva la retención y no
confirma pagos.

La migración 007 añade `payment_evidence` y `delivery_evidence` (RLS forzada, solo
lectura para la API, sin acceso directo del worker). `confirm_testnet_payment` exige
login asignado, lease vigente, tarjeta `testnet`, hash del intento, digest del sobre
cifrado, passphrase Testnet, activo, contrato origen, destinatario, importe y ledger
dentro de los límites; un hash solo puede liquidar una orden. Es idempotente ante
repetición idéntica con el mismo token. `record_demo_delivery` solo actúa con
evidencia de pago persistida. Una política RESTRICTIVE impide que la API encole
eventos distintos de `payment`.

La migración 008 cierra la suplantación de `wallet.tenant_id` por el rol de API:
`verify_credential` vincula la transacción (backend y xid) al tenant y la sesión de una
credencial y sesión vigentes en `api_context`, sin acceso directo de los roles de ejecución.
Una política RESTRICTIVE `api_credential_scope` exige ese tenant en cada tabla con
`tenant_scope` y `lock_card` exige la sesión vinculada. Cambiar el GUC no da acceso a
otro tenant y una segunda credencial de otro tenant en la misma transacción se rechaza.
Riesgo residual: quien tenga el login de API y un token válido de un tenant actúa como ese
tenant; dentro del tenant, RLS no separa sesiones salvo en `lock_card`. El worker
asignado sigue siendo de confianza para verificar el RPC antes de `confirm_testnet_payment`.

La migración 009 integra WalletFoundation v2: `cards.policy_revision` (revisión revisada por un
administrador), interfaz y revisión por sobre cifrado, eliminación de `store_testnet_envelope` v1 y
confirmación solo para sobres v2. Los sobres v1 existentes se conservan para auditoría.

La migración 010 añade `broadcast_authorizations`: un administrador (`authorize_testnet_broadcast`, sin
concesión a roles de ejecución) autoriza el hash exacto del sobre v2 de una orden de 0,50 USDC con caducidad
máxima de 24 h y 1–5 reenvíos. El worker solo la consume con `begin_testnet_broadcast` bajo lease vigente,
que persiste `uncertain` antes del envío. Ningún rol de ejecución puede leerla ni modificarla.

Despliegue en un servicio privado (Supabase: compatibilidad, logins, pooler de sesión, TLS `verify-full` y alta de la
prueba): ver [runbook Testnet, secciones 2 y 3](../../docs/testnet-runbook.md#2-postgresql-privado-supabase).
