# Arquitectura del monorepo

~~~mermaid
flowchart LR
  U["Web / móvil / extensión"] --> A["Wallet API"]
  C["MCP / Telegram / WhatsApp / terminal"] --> A
  A --> D["Dominio"]
  D --> S["Persistencia y colas"]
  D --> P["Puertos de pago y evidencia"]
  P --> W["Adaptador, firma aislada, Stellar y proveedor"]
  S --> R["Worker de conciliación"]
  W --> R
  R --> S
~~~

La base ejecutable inicia los clientes, un health check de Fastify, un servidor stdio y los puntos de entrada de canal. El mapa representa el objetivo.

| Ruta | Límite |
| --- | --- |
| `apps/*` | UX y transporte. Las aprobaciones sensibles se completan en superficies de dueño con passkey. |
| `services/api` | Resuelve sesión, tenant y tarjeta. Valida solicitudes y persiste la intención antes de enviar. |
| `services/worker` | Reconciliación, outbox y cursores. Nunca trata un resultado RPC incierto como un cargo fallido. |
| `services/whatsapp` | Frontera de webhooks y avisos, habilitada después de verificar el caso con Meta. |
| `packages/domain` | Reglas del negocio. Los protocolos de canal, RPC y almacenamiento entran por puertos. |
| `packages/api-contracts` y `packages/wallet-sdk` | Esquemas de transporte versionados y cliente compartido. |
| `packages/tilcai-adapter` | Traduce capacidades upstream versionadas, con fallos explícitos. |
| `contracts/soroban` | Autoridad y límites de cadena. El ejemplo compila sin facultades de gasto. |

## Autoridad

Una tarjeta pertenece a una sesión lógica. Su subcuenta aloja fondos separados. Renovar el token conserva saldo y contador. La reinstalación requiere aprobación y rotación. Solo se informa revocación on-chain tras confirmarla. La UI muestra saldo confirmado y disponible del agente como importes diferentes.

## Orden y evidencia

Autorizar → registrar la orden → simular → persistir intento y hash → enviar → reconciliar pago y entrega → emitir el recibo. Seguir el hash persistido antes de reintentar. Una sesión agotada solicita aumento y retoma la misma orden tras confirmar la nueva versión de política y revalidar la cotización.
