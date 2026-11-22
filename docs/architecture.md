# Arquitectura del monorepo

~~~mermaid
flowchart LR
  U["Web / móvil / extensión"] --> A["Wallet API"]
  C["MCP / Telegram / WhatsApp / terminal"] --> A
  A --> D["Dominio"]
  D --> S["Supabase Postgres privado<br/>Órdenes, intentos e idempotencia"]
  A --> O["Supabase Storage privado<br/>Entregables autorizados"]
  D --> P["Puertos de pago y evidencia"]
  P --> W["Adaptador, firma aislada, Stellar y proveedor"]
  S --> R["Worker de conciliación"]
  W --> R
  R --> S
~~~

La base ejecutable inicia los clientes, un health check de Fastify, un servidor stdio y los puntos de entrada de canal. El mapa representa el objetivo.

| Ruta | Límite |
| --- | --- |
| `apps/landing` | Página pública estática. No usa la API ni maneja datos de usuarios. |
| `apps/*` | UX y transporte. Las aprobaciones sensibles se completan en superficies de dueño con passkey. |
| `services/api` | Resuelve sesión, tenant y tarjeta. Valida solicitudes y persiste la intención antes de enviar. |
| `services/worker` | Reconciliación, outbox y cursores. Nunca trata un resultado RPC incierto como un cargo fallido. |
| `services/whatsapp` | Frontera de webhooks y avisos, habilitada después de verificar el caso con Meta. |
| `packages/domain` | Reglas del negocio. Los protocolos de canal, RPC y almacenamiento entran por puertos. |
| `packages/api-contracts` y `packages/wallet-sdk` | Esquemas de transporte versionados y cliente compartido. |
| `packages/tilcai-adapter` | Traduce capacidades upstream versionadas, con fallos explícitos. |
| `contracts/soroban` | Autoridad y límites de cadena. El prototipo restringe transferencias del saldo del contrato; se verificó un pago y un rechazo en Testnet. No implementa `__check_auth`. |
| Postgres y Storage | Postgres coordina los estados operativos con aislamiento por tenant. Storage privado guarda archivos autorizados. La DB y los buckets quedan detrás de la API y servicios internos. |

## Autoridad

Una tarjeta pertenece a una sesión lógica. Su subcuenta aloja fondos separados. Renovar el token conserva saldo y contador. La reinstalación requiere aprobación y rotación. Solo se informa revocación on-chain tras confirmarla. La UI muestra saldo confirmado y disponible del agente como importes diferentes.

El dueño autoriza administración mediante WebAuthn y reglas de cuenta. El firmante delegado autoriza el gasto de su tarjeta. El relayer patrocina y envía. Registrar factory, autoridad de actualización y respaldo por ambiente. Probar que el delegado y el relayer carecen de permisos para cambiar políticas, recuperar o retirar fondos por su cuenta.

## Orden y evidencia

Registrar orden → simular en modo de registro → firmar la autorización exacta → verificar el sobre con las firmas finales → persistir intento y hash → enviar → conciliar pago y entrega → emitir el recibo. La verificación incluye la simulación final del pagador de comisiones. Seguir el hash original si la respuesta es incierta. Una sesión agotada retoma la misma orden tras confirmar el nuevo límite y revalidar la cotización.

Soroban verifica tope, activo, destino, función y vigencia. Postgres mantiene un intento activo por orden y coordina la retención operativa. En la primera entrega la unicidad comercial vive en la ruta coordinada por la API. Los rechazos directos en Soroban prueban por separado la política contractual. [Persistencia](persistence.md) · [Validación](validation.md)

## Autorización de la tarjeta experimental

**Estado** Investigación en curso. La cuenta Stellar clásica `G…` autoriza la orden con una firma Ed25519 de transacción. La tarjeta experimental `C…` agrega una firma ML-DSA sobre la autorización de Soroban. El firmante vive aislado. El relayer envía con Ed25519 y la subcuenta usa `__check_auth` para verificar la firma y las reglas de gasto. La primera prueba usa 0,50 USDC de Testnet y el pago directo.

El dominio conserva orden, intento, política y recibo. El algoritmo se resuelve en el adaptador, el firmante y el contrato. El worker concilia la evidencia antes de mostrar «Autorización ML-DSA verificada · Testnet». La passkey, la recuperación del dueño, el relayer y el consenso tienen sus propias autoridades y criterios de seguridad. [Diagrama, protocolo de prueba y alcance](research/post-quantum.md#orden-de-pago-y-capas-de-firma)

[Prioridades y dependencias](roadmap.md) · [Guion de demo](demo.md) · [README](../README.md)
