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
