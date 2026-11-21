# Persistencia y conciliación

- Las referencias de wallet, sesión, tarjeta, política, orden e intento se guardan con alcance de tenant.
- SQLite es la opción inicial con una instancia escritora. Si API y worker escriben en procesos separados, deben coordinarse a través de un dueño de escritura o usar PostgreSQL antes de escalar.
- Separar credenciales rotables y la sesión lógica. Las rotaciones conservan tarjeta y contador.
- Fijar la unicidad por tenant, operación y clave de idempotencia con payload canónico. Guardar cada hash antes del envío y consultar el resultado incierto antes de reintentar.
- Cada movimiento financiero obtiene confirmación de Stellar. La proyección de saldos indica activo, red y ledger. La entrega tiene estado independiente.
- Una transición y su evento de outbox se persisten de forma atómica. El worker reanuda por cursor y publica en orden por wallet.

Pendientes de implementación: migraciones, pruebas de concurrencia, persistencia de intentos de compra, outbox y política de respaldo.
