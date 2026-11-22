# Persistencia de compra (en construcción)

`migrations/001_purchase.sql` es una base de esquema sin concesiones a roles de
runtime. No está conectada a la API ni al worker y todavía no ha sido probada en
PostgreSQL 17. No aplicarla en Supabase ni considerar su RLS como validada: faltan
provisión de roles mínimos, resolución autenticada del tenant, aplicación versionada,
reclamación con fencing y pruebas de aislamiento y concurrencia.

Para una base **desechable** PostgreSQL 17, con `psql` y un usuario de prueba
superusuario, `WALLET_TEST_DATABASE_URL=... bash infra/postgres/test-db.sh` aplica
la migración dos veces y comprueba una parte de RLS. El script crea objetos en esa
base y no debe apuntar a un entorno compartido o remoto persistente. No imprime la
URL deliberadamente. Quedan por probar los demás casos de concurrencia y fencing.
