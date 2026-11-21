# TilcAI Wallet

TilcAI Wallet hace verificables las compras de agentes de IA con una tarjeta fondeada por sesión, controles desde el celular y recibos que enlazan permiso, orden, pago y entrega.

El cliente inicial son agencias de automatización con IA en La Paz, Bolivia, que compran datos e informes para proyectos de clientes. El piloto incluye freelancers que operan agentes para clientes. La hipótesis de ingresos es una suscripción mensual por agencia.

Este repositorio contiene la base de desarrollo. Los puntos de entrada y controles de compilación permiten trabajar por módulo. Las cuentas, compras y límites de la wallet se implementarán y probarán en Stellar testnet.

## Arrancar

Requiere Node.js 24.22.1 y pnpm 10.33.0. La versión de Node está en `.node-version` y la de pnpm en `package.json`. Para el workspace Soroban se necesitan Rust y Stellar CLI.

~~~sh
pnpm install --frozen-lockfile
pnpm check
~~~

| Superficie | Comando desde la raíz | Base incluida |
| --- | --- | --- |
| [Web](apps/web/README.md) | `pnpm --filter @tilcai-wallet/web dev` | Next.js 16.4, Tailwind 4 y manifest web |
| [Móvil](apps/mobile/README.md) | `pnpm --filter @tilcai-wallet/mobile dev` | Expo 58, React Native 0.88.1 y Expo Router |
| [Extensión](apps/extension/README.md) | `pnpm --filter @tilcai-wallet/extension build` | WXT, Manifest V3, popup y service worker |
| [MCP](apps/mcp/README.md) | `pnpm --filter @tilcai-wallet/mcp start` | Servidor stdio con SDK v2 y prueba de arranque |
| [Bot de Telegram](apps/telegram-bot/README.md) | `pnpm --filter @tilcai-wallet/telegram-bot check` | Fábrica de bot con grammY |
| [Mini App de Telegram](apps/telegram-miniapp/README.md) | `pnpm --filter @tilcai-wallet/telegram-miniapp dev` | React y Vite |
| [WhatsApp](services/whatsapp/README.md) | `pnpm --filter @tilcai-wallet/whatsapp dev` | Servicio aislado con health check en el puerto 4001 |
| [CLI](apps/cli/README.md) | `pnpm --filter @tilcai-wallet/cli start --help` | Commander y comando `health` |
| [TUI](apps/tui/README.md) | `pnpm --filter @tilcai-wallet/tui start` | Vista de arranque con Ink |
| [API](services/api/README.md) | `pnpm --filter @tilcai-wallet/api dev` | Fastify y `GET /healthz` en el puerto 4000 |
| [Worker](services/worker/README.md) | `pnpm --filter @tilcai-wallet/worker check` | Entrada y validación de configuración |
| [Soroban](contracts/soroban/README.md) | `cargo test --workspace --lib --locked` desde `contracts/soroban` | Workspace Cargo y contrato de arranque |

Usa procesos de terminal separados. El SDK y la CLI consultan `http://127.0.0.1:4000` por defecto. `.env.example` documenta valores de arranque. Los procesos leen variables del entorno. En el módulo móvil, `build` exporta la vista web de Expo. El desarrollo para teléfono sigue la guía del módulo.

## Estructura

~~~text
apps/                 # web, mobile, extension, mcp, Telegram, cli y tui
services/             # api, worker y adaptador de WhatsApp
packages/             # config, api-contracts, domain, wallet-sdk y tilcai-adapter
contracts/soroban/    # workspace Rust y contrato de arranque
infra/                # convenciones de entorno y operación
tests/                # pruebas transversales
docs/                 # arquitectura, decisiones, stack y guion de demo
~~~

Usa `packages/api-contracts` para los esquemas de API. Los canales usan `packages/wallet-sdk`. El gateway y el worker comparten reglas con `packages/domain`. El adaptador incorpora capacidades verificadas de la infraestructura de TilcAI. El bot de Telegram y el servidor MCP viven en este monorepo.

## Checklist del equipo

### 0. Base de desarrollo

- [x] Crear workspace pnpm con dependencias fijadas y un único lockfile JavaScript.
- [x] Preparar apps, adaptadores, API, worker, paquetes, Rust, comandos por módulo y CI.
- [x] Agregar pruebas de humo de salud y MCP, y un test del contrato base.
- [ ] Definir entornos, credenciales de testnet, activos y responsables mediante PR.

### 1. Autoridad, API y estado

- [ ] Modelar usuarios, tenants, sesiones lógicas, credenciales, tarjetas, políticas y recuperaciones.
- [ ] Implementar alta, respaldo, WebAuthn, scopes, cierre y rotación.
- [ ] Implementar intención de vínculo y fondeo con enlace de uso único.
- [ ] Persistir órdenes, intentos, idempotencia, retenciones y outbox.
- [ ] Versionar contratos de API, permitir consultas por alcance y proyectar el estado confirmado.
- [ ] Aislar el firmante delegado y medir despliegue y restauración de subcuentas.

### 2. Compra directa y recibo

- [ ] Confirmar la cuenta de contrato, factory, activo de prueba y proveedor.
- [ ] Limitar activo, destino, monto, vigencia y gasto acumulado. Probar el rechazo directo en Soroban.
- [ ] Implementar cotización, simulación, firma aislada, envío y conciliación por hash.
- [ ] Conservar el pedido ante resultado incierto, cotización vencida o rechazo de presupuesto.
- [ ] Registrar evidencia autenticada de entrega y emitir un recibo con ID estable.
- [ ] Reconciliar eventos, cursor, entrega tardía, duplicados y costo de las transacciones.

### 3. Primera integración web móvil y MCP

- [ ] Mostrar saldo distinguido del disponible, centro de sesiones, tarjetas y extracto.
- [ ] Implementar herramientas para consultar presupuesto, pedir una compra, solicitar aumento y buscar recibo.
- [ ] Aprobar el aumento con passkey y retomar la misma orden tras confirmar y revalidar.
- [ ] Congelar, reactivar, revocar y devolver remanente con estados de confirmación.
- [ ] Reproducir los dos pagos y los rechazos del [guion de demo](docs/demo.md).

### 4. Canales adicionales

- [ ] Móvil. Confirmar compilaciones iOS/Android, enlaces verificados, passkeys y notificaciones.
- [ ] Extensión. Revisar permisos por origen, mensajes, expiración, revocación y Chrome/Edge.
- [ ] MCP remoto. Integrar Streamable HTTP y validar autenticación, scopes y cada cliente.
- [ ] Telegram. Validar bot y Mini App, vínculo, avisos y retorno al panel seguro.
- [ ] WhatsApp. Verificar compatibilidad del caso con Meta, plantillas y webhooks.
- [ ] CLI/TUI. Añadir alta autorizada, estado de sesión, consultas y recibos.

### 5. Pruebas operativas y piloto

- [ ] Probar aislamiento de tenants, dos tarjetas independientes y rotación sin reiniciar gasto.
- [ ] Probar límites, revocación, resultados ambiguos, protección contra duplicados y retorno de fondos.
- [ ] Evaluar x402 y MPP con la smart account y capacidades de fondeo mediante rutas validadas.
- [ ] Medir costo, tiempo de conciliación, disponibilidad y disposición a pagar con agencias y freelancers.
- [ ] Registrar demo, hashes, resultados y estado por canal antes de publicar la postulación.

## Documentación

- [Producto y ejemplo](docs/product.md)
- [Arquitectura del monorepo](docs/architecture.md)
- [Stack y fuentes oficiales](docs/stack.md)
- [Persistencia y conciliación](docs/persistence.md)
- [ADR 001 · Canales propios](docs/adr/001-owned-channels.md)
- [ADR 002 · Herramientas y riel de demo](docs/adr/002-toolchain-and-demo.md)
- [Guion de demo](docs/demo.md)
- [Cómo contribuir](CONTRIBUTING.md)
- [Perfil del proyecto](https://github.com/TilcAI-Wallet)
