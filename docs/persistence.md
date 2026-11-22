# Persistencia y conciliación

**Diseño objetivo** Supabase Postgres será la base operativa de la primera compra integrada. Stellar confirma el dinero y las políticas efectivas. El proveedor aporta evidencia de entrega. Las migraciones, los roles y el bucket privado están pendientes de implementación. [ADR 003](adr/003-supabase-persistence.md)

## Qué se guarda

| Grupo | Datos y alcance |
| --- | --- |
| Identidad | Tenant, membresías, claves públicas de passkeys, conexiones, sesión lógica, credenciales rotables e intenciones consumibles. Derivar tenant y permisos de credenciales verificadas y membresía vigente. |
| Wallet | Cuenta principal, red, tarjeta por sesión, subcuenta, política versionada y proyección del saldo por activo y ledger. Los importes se guardan en unidades atómicas. La política y el contador efectivos se leen de Stellar. |
| Compra | Orden canónica, cotización, máximo, destino, solicitud de aumento, retención, intentos, hash, estado y evidencia de pago. |
| Entrega | Identidad del proveedor, `delivery_id`, orden, digest del artefacto, acceso y estados de disputa o reembolso. Conservar el cargo y el abono como registros separados. |
| Operación | Claves de idempotencia, outbox, inbox, leases de trabajo, cursores de ingesta, proyecciones reconstruibles y eventos redactados. |

Los entregables que la wallet deba alojar se guardan en un bucket **privado** de Supabase Storage. Postgres conserva la referencia y el digest. Fastify comprueba el acceso al objeto antes de emitir una URL firmada de duración corta. Una URL ya emitida puede funcionar hasta su vencimiento. Los secretos de firma, las claves de API y las trazas con autorizaciones utilizables viven en sus servicios de custodia o almacenamiento restringido. [Buckets privados](https://supabase.com/docs/guides/storage/buckets/fundamentals)

## Aislamiento y acceso

- Mantener esquema privado y acceso a tablas solo para roles de API, worker y migraciones según su función. Configurar la Data API para excluir las tablas operativas o mantenerla deshabilitada si el proyecto carece de otros usos.
- Resolver el tenant en el servidor y aplicarlo en cada lectura y mutación. Usar claves y relaciones que incluyan tenant y entorno para prevenir referencias cruzadas. Aplicar RLS como segunda barrera con roles sin bypass ni propiedad de tablas, contexto de tenant fijado dentro de la transacción y rechazo por defecto si falta el contexto.
- Limitar el acceso global del worker a su cola de trabajo. Tras reclamar una tarea, abrir la operación de negocio con el contexto de su tenant. Probar que el pool descarta ese contexto al terminar la transacción. Los clientes solo consumen la Wallet API.

## Orden e intento de pago

1. Asociar la clave de idempotencia a tenant, entorno, operación y actor o sesión según corresponda. Guardar el hash del contenido canónico. Repetir la misma solicitud devuelve la orden existente. Reusar la clave con otro contenido devuelve `409`.
2. Aplicar **un intento activo por orden** con una restricción de Postgres. Una transacción corta coordina el estado, la retención y el outbox. La retención descuenta capacidad en la proyección. Soroban compara el gasto contabilizado más el nuevo pago contra el tope contractual. La transferencia y el contador se actualizan atómicamente.
3. Preparar la transacción final y persistir su hash, red y límites de validez **antes del envío**. Guardar un sobre privado y de vida corta si se necesita reanudar el mismo envío. El worker reclama trabajo mediante un lease y comprueba que sigue siendo su dueño al escribir resultados.
4. Si se pierde la respuesta, consultar el mismo hash. `NOT_FOUND` por sí solo conserva el estado incierto. Autorizar un nuevo intento solo tras constatar fallo definitivo o expiración e imposibilidad de liquidación mediante evidencia del ledger. La retención sigue activa durante la incertidumbre.
5. Guardar la liquidación verificada por red, hash e índice de evento. Reconciliar callback e ingestión mediante inbox y cursor. Si aparece otra liquidación para la misma orden, conservar la evidencia y abrir una discrepancia de conciliación. Pago, entrega y reembolso tienen estados independientes.

**Alcance de unicidad.** La primera entrega garantiza la unicidad comercial en la ruta gestionada por la API y el relayer. El nonce de Soroban impide reusar una autorización específica. Una garantía comercial en cadena requiere consumir un identificador estable de la orden en la misma operación que transfiere. El ID de intento puede cambiar al reintentar. [SEP-41](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0041.md) · [Autorización Soroban](https://developers.stellar.org/docs/learn/fundamentals/contract-development/authorization)

## Recuperación y verificación

- Guardar cursor y contexto por red, contrato y filtro. Detectar gaps y reconstruir con una fuente histórica validada. Marcar proyecciones desactualizadas hasta conciliar. [Stellar RPC](https://developers.stellar.org/docs/data/apis/rpc/api-reference/methods/getEvents)
- Probar un arranque limpio, dos escritores concurrentes, un reinicio antes y después de enviar, callbacks repetidos y acceso cruzado desde dos tenants.
- Definir retención, respaldo y recuperación de Postgres y de objetos privados como operaciones separadas. Verificar la restauración antes de un piloto con datos reales. [Backups](https://supabase.com/docs/guides/platform/backups)
- Para la tarjeta experimental, el recibo guarda subcuenta, algoritmo, versión de política, hash y ledger. Distinguir la evidencia de autorización observada en cadena de los metadatos declarados en el intento. [Investigación poscuántica](research/post-quantum.md#tarea-delegable)

[Arquitectura](architecture.md) · [Prioridades](roadmap.md) · [Plan de validación](validation.md)
