# Validación y criterios de salida

**Estado** Paquete de pruebas pendiente. La auditoría documental genera requisitos de verificación. Los resultados de compra, seguridad y operación se registran conforme se prueban.

## Primer corte en Stellar Testnet

| Frente | Evidencia de salida | Hallazgos cubiertos |
| --- | --- | --- |
| **Contratos y patrocinio** | Contrato y activo identificados por red. Una transferencia de 0,50 USDC de prueba. Rechazo directo en Soroban por destino, activo, función, importe o vigencia inválidos. Probar dos gastos que compiten por el mismo tope. Capturar simulación de registro, autorización firmada, simulación de verificación previa al envío, hash y ledger. | R-01 a R-05 |
| **Identidad y administración** | Separar login, aprobación de la acción exacta, recuperación y autoridad on-chain. Probar pérdida de dispositivo, rotación, revocación, intento con autorización anterior y devolución única tras conciliar pagos en vuelo. Clasificar TTL, responsable de renta y restauración con contador intacto. | R-06 a R-08 |
| **Postgres, envío y reconciliación** | Contención real entre API y worker. Un intento activo por orden. Repetición devuelve el mismo resultado, cambio de payload devuelve `409`. Simular caída antes y después del envío, resultado incierto y reanudación por cursor. Dos tenants con lecturas y mutaciones cruzadas rechazadas. | R-09 a R-12, R-17 |
| **Recibo y canales iniciales** | Web móvil y MCP ven el mismo recibo. Pago y entrega evolucionan por separado. Callback autenticado, repetido o ligado a otra orden. El agente solicita un aumento y el dueño lo aprueba desde el panel. Comprobar scopes, reautorización y rechazo de instrucciones de proveedor presentadas como acciones. | R-13, R-14, R-16 |

La primera entrega usa **unicidad de orden en la ruta gestionada por la aplicación** y controles de gasto en el contrato. Para una unicidad comercial en cadena deben probarse dos autorizaciones distintas para la misma orden y el consumo atómico de un identificador estable. Un resultado incierto se mantiene pendiente con el hash original.

## Activación por canal y riel

- **MCP remoto.** Metadatos de recurso protegido, emisor, PKCE, audiencia y recurso canónico, scopes por objeto y revocación. Verificar dos instalaciones independientes. `stdio` usa el contexto local y conserva los mismos límites de negocio.
- **Web y móvil.** Verificar WebAuthn por origen y RP ID, enlaces de aplicación, confirmación del cambio exacto y recuperación con el dispositivo anterior revocado.
- **Telegram, WhatsApp, extensión y terminal.** Verificar firma y vigencia de `initData` en backend, elegibilidad y webhooks de Meta, origen y contexto de mensajes de extensión, y autorización en navegador externo para terminal. Probar vínculo consumible, eventos repetidos y revocación. Marcar cada canal como propuesto, probado o no compatible con la configuración evaluada.
- **x402, MPP, CCTP y anchors.** Fijar versión, red, activo, proveedor y configuración de cada riel. Validar recepción, liquidación y salidas ante fallos. Para CCTP validar parámetros de destino antes de quemar. Para SEP-24/45 validar capacidades del anchor y de la cuenta. Para MPP documentar Charge o Session y las garantías que aporta. **R-15**.
- **ML-DSA en Testnet.** Investigación en curso. Verificar política obligatoria, rechazos, hash, costo y alcance de las autoridades. Mantener la investigación como pista paralela. [Criterios del experimento](research/post-quantum.md#tarea-delegable)

## Registro y paso a fondos reales

| Evidencia | Alcance |
| --- | --- |
| **Registro público** | Commit, versiones, red, contrato y activo, hash, ledger, caso de prueba, resultado esperado y observado. Indicar si la evidencia es de diseño, upstream, Testnet observada o producción. |
| **Material restringido** | Trazas sensibles redactadas para compartir. Custodiar sobres, autorizaciones reutilizables, tokens, credenciales y entregables en sus fronteras privadas. |
| **Operación y continuidad** | Probar restauración de Postgres y de objetos, revisar dependencias y SBOM, alarmas, rotación, rollback y respuesta a incidentes. Fijar metas de pérdida de datos y tiempo de recuperación para el ambiente real. |
| **Producción** | Decisión explícita tras revisión independiente, recuperación probada, control de custodia y gasto, validación jurídica local y reglas sobre privacidad, proveedores, fondeo y tratamiento de datos. **R-17, R-18**. |

[Orden de trabajo](roadmap.md) · [Demo canónica](demo.md) · [Persistencia](persistence.md) · [Stellar: firma y simulación](https://developers.stellar.org/docs/build/guides/transactions/signing-soroban-invocations)
