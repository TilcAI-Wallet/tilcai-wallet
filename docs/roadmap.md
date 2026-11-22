# Prioridades y dependencias de TilcAI Wallet

**Revisión del 21 de noviembre de 2026.** Cada fila se puede convertir en una tarea. Los responsables se asignan al distribuir el trabajo. [Decisión de almacenamiento](adr/003-supabase-persistence.md) · [Criterios de validación](validation.md)

La base incluye el workspace, los esqueletos de los canales, CI y pruebas de humo. La API y el SDK exponen la ruta de salud. MCP ofrece transporte stdio y responde al protocolo. Soroban tiene un prototipo de fondos retenidos y límite de gasto; el primer pago y un rechazo se verificaron en Testnet. La integración completa sigue pendiente. El worker valida configuración y el adaptador resuelve la red. Las conexiones con cuentas, relayer y monitor upstream requieren una prueba integrada. La landing es informativa.

| Orden | Entregable y módulos | Depende de | Evidencia para cerrar |
| --- | --- | --- | --- |
| **P0.0 · Entorno e interfaces** | Fijar Testnet, activo, proveedor, env y CI. Definir OpenAPI y ejemplos de sesión, tarjeta, orden, errores y recibo. Preparar entorno local de Postgres. | Base del monorepo. | Los canales consumen los mismos esquemas y ejemplos. Se registra el entorno reproducible. |
| **P0.1A · Cuenta y política Soroban** | Validar factory, autoridad, fondeo y devolución. Aislar firmante y patrocinio. Probar activo, destino, función, máximo, tope acumulado, expiración, revocación, rentas y restauración. | P0.0. Puede avanzar en paralelo con P0.1B. | Un pago permitido, rechazos directos, contador conservado y retorno único del saldo. |
| **P0.1B · Identidad y persistencia** | Passkeys y respaldo, intención consumible y scopes. Crear el esquema inicial de Supabase Postgres mediante migraciones versionadas. Implementar roles, RLS, órdenes, intentos, outbox, inbox e idempotencia. | P0.0. Puede avanzar en paralelo con P0.1A. | Arranque limpio, dos tenants aislados, dos escritores coordinados, respuesta repetible y conflicto `409`. |
| **P0.2 · Pago directo y recibo** | Unir gateway, firmante, relayer, worker y proveedor. Simular con las firmas finales, persistir hash antes de enviar, conciliar y validar entrega. Probar caída antes y después del envío. | P0.1A y P0.1B. | Un pago de 0,50 USDC de prueba, cero cargos adicionales al repetir, recibo y hash reproducibles. |
| **P0.3 · Web móvil y MCP stdio** | Web del dueño con sesión, tarjeta, saldo, aumento, congelación y recibo. MCP con consulta de presupuesto, compra, solicitud de aumento y lectura de recibo. | Los ejemplos de P0.0 permiten empezar ambas interfaces. La integración usa P0.1B y P0.2. | [Demo canónica](demo.md) completa, recibo compartido y segunda compra después de confirmar el aumento. |
| **P1.1 · Dos sesiones y renovación** | Añadir historial por tarjeta, nueva instalación con passkey, rotación de firmante, estados confirmados y devolución del remanente. | P0.3 y reglas verificadas en P0.1A. | Dos tarjetas fondeadas, contador conservado al renovar y segunda tarjeta operativa al congelar la primera. |
| **P1.2 · Móvil nativo y extensión** | Expo para iOS y Android con passkeys, enlaces asociados y notificaciones. Extensión con vínculo por origen, saldo, estados y revocación. | Arranque visual y pruebas de plataforma desde P0.0. Conexión real con P0.1B. Acciones de gasto o administración después de P0.3 y P1.1 según el permiso. | Se vincula una sesión con alcance comprobado. La revocación se refleja en la interfaz. |
| **P1.3 · Telegram, CLI y TUI** | Bot y Mini App de Telegram con vínculo, aviso de aumento y retorno al panel. Alta autorizada, consultas y recibos por terminal mediante `wallet-sdk`. | P0.1B para identidad y vínculo. P0.3 para órdenes, avisos y recibos. | Telegram y terminal ubican la misma sesión y orden. La aprobación se completa en el panel del dueño. |
| **P1.4 · MCP remoto** | Añadir Streamable HTTP y autorización. Aislar tokens por audiencia y recurso y verificar clientes individualmente. | MCP stdio de P0.3 y rotación de P1.1. | Conexiones y revocación verificadas por cliente, con rechazos por scope insuficiente y token ajeno. |
| **P2 · WhatsApp, operación y piloto** | Validar caso con Meta, plantillas y webhooks. Probar restauración de datos y objetos, monitoreo, recuperación y salida de incidentes. Evaluar rieles por separado y completar revisión independiente y local antes de fondos reales. | P0.3, P1.1 y validación por canal o proveedor. | Avisos idempotentes, continuidad reproducible, evidencia por riel y decisión explícita de avance. |
| **I+D · Firma poscuántica** | Probar ML-DSA-44 en una subcuenta Soroban aislada. Medir una transferencia y rechazos. Incorporar evidencia experimental al recibo cuando se confirme. | Entorno de P0.0 para empezar. Usa P0.1A y P0.2 como referencia para integrar y comparar. | Hash en Testnet, rechazos verificables y comparación de tamaño, costo y latencia. [Tarea delegable](research/post-quantum.md#tarea-delegable). |

Asignar **contratos y backend en paralelo** y abrir **web móvil y MCP** sobre los esquemas y datos de prueba. Móvil nativo, extensión y Telegram también pueden preparar navegación, permisos y vínculo. Cada canal aporta su prueba de conexión, permisos, revocación y retorno al mismo recibo antes de habilitar las acciones correspondientes.

[README](../README.md) · [Checklist histórico](#checklist-histórico-del-equipo) · [Arquitectura](architecture.md) · [Demo](demo.md) · [Investigación poscuántica](research/post-quantum.md)

---

## Checklist histórico del equipo

> **Planificación histórica.** Copia del checklist que figuraba en el README principal hasta su reescritura del 22 de noviembre de 2026, con los enlaces ajustados a esta carpeta. Las marcas y los contadores conservan el estado registrado en ese momento y no se han actualizado. El avance posterior se documenta en los PR y en [Validación](validation.md).

El [orden de integración](#prioridades-y-dependencias-de-tilcai-wallet) indica qué desbloquea cada entrega. Acordar primero el entorno y los esquemas, iniciar contratos e identidad en paralelo y preparar web móvil y MCP con datos de prueba.

<details open>
<summary><b>0. Base de desarrollo</b> · 3/4</summary>

- [x] Crear workspace pnpm con dependencias fijadas y un único lockfile JavaScript.
- [x] Preparar apps, adaptadores, API, worker, paquetes, Rust, comandos por módulo y CI.
- [x] Agregar pruebas de humo de salud y MCP, y un test del contrato base.
- [ ] Definir entornos, credenciales de testnet, activos y responsables mediante PR.

</details>

<details>
<summary><b>1. Autoridad, API y persistencia</b> · 0/7</summary>

- [ ] Modelar usuarios, tenants, sesiones lógicas, credenciales, tarjetas, políticas y recuperaciones.
- [ ] Implementar alta, respaldo, WebAuthn, scopes, cierre y rotación.
- [ ] Implementar intención de vínculo y fondeo con enlace de uso único.
- [ ] Preparar Supabase Postgres para local y Testnet con migraciones, roles mínimos y RLS en tablas de tenant.
- [ ] Persistir órdenes, intentos, idempotencia, retenciones, outbox e inbox. Probar la contención de API y worker.
- [ ] Versionar OpenAPI y esquemas, autorizar por objeto y proyectar el estado confirmado.
- [ ] Aislar el firmante delegado y medir despliegue y restauración de subcuentas.

</details>

<details>
<summary><b>2. Compra directa y recibo</b> · 0/6</summary>

- [ ] Confirmar la cuenta de contrato, factory, activo de prueba y proveedor.
- [ ] Limitar activo, destino, monto, vigencia y gasto acumulado. Probar el rechazo directo en Soroban.
- [ ] Implementar cotización, simulación de registro, firma aislada, simulación de verificación final, envío y conciliación por hash.
- [ ] Conservar el pedido ante resultado incierto, cotización vencida o rechazo de presupuesto.
- [ ] Registrar evidencia autenticada de entrega y emitir un recibo con ID estable.
- [ ] Reconciliar eventos, cursor, entrega tardía, duplicados y costo. Probar reinicios antes y después del envío.

</details>

<details>
<summary><b>3. Primera integración · web móvil y MCP stdio</b> · 0/5</summary>

- [ ] Mostrar saldo distinguido del disponible, centro de sesiones, tarjetas y extracto.
- [ ] Implementar herramientas para consultar presupuesto, pedir una compra, solicitar aumento y buscar recibo.
- [ ] Aprobar el aumento con passkey y retomar la misma orden tras confirmar y revalidar.
- [ ] Congelar, reactivar, revocar y devolver remanente con estados de confirmación.
- [ ] Reproducir los dos pagos y los rechazos del [guion de demo](demo.md).

</details>

<details>
<summary><b>4. Canales adicionales · P1 y P2</b> · 0/6</summary>

- [ ] **Móvil.** Confirmar compilaciones iOS/Android, enlaces verificados, passkeys y notificaciones.
- [ ] **Extensión.** Revisar permisos por origen, mensajes, expiración, revocación y Chrome/Edge.
- [ ] **MCP remoto.** Integrar Streamable HTTP y validar autenticación, scopes y cada cliente.
- [ ] **Telegram.** Validar bot y Mini App, vínculo, avisos y retorno al panel seguro.
- [ ] **CLI/TUI.** Añadir alta autorizada, estado de sesión, consultas y recibos.
- [ ] **WhatsApp (P2).** Verificar compatibilidad del caso con Meta, plantillas y webhooks.

</details>

<details>
<summary><b>5. Pruebas operativas y piloto</b> · 0/5</summary>

- [ ] Probar aislamiento de tenants, dos tarjetas independientes y rotación sin reiniciar gasto.
- [ ] Probar límites, revocación, resultados ambiguos, protección contra duplicados y retorno de fondos.
- [ ] Evaluar x402 y MPP con la smart account y capacidades de fondeo mediante rutas validadas.
- [ ] Medir costo, tiempo de conciliación, disponibilidad y disposición a pagar con agencias y freelancers.
- [ ] Registrar demo, hashes, resultados y estado por canal. Probar restauración, custodia y operación antes de usar fondos reales.

</details>

<details>
<summary><b>I+D. Autorización poscuántica en Stellar Testnet</b> · investigación en curso</summary>

- [x] Documentar el alcance de CAP-87 y confirmar Protocolo 30 en Testnet.
- [ ] Probar SDK y CLI compatibles y una autorización ML-DSA-44 en una subcuenta aislada.
- [ ] Registrar pago de 0,50, rechazos de contrato y comparación con autorización clásica en Soroban.
- [ ] Conciliar la evidencia y mostrar el alcance en el recibo experimental.

[Tarea delegable](research/post-quantum.md#tarea-delegable)

</details>
