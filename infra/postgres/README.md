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
