# API v1 y entorno de la demo

Backend, PWA y MCP comparten los esquemas de `@tilcai-wallet/api-contracts` y los ejemplos de `@tilcai-wallet/api-contracts/fixtures`. El guion usa la tarjeta **Codex · Portátil** con 20 USDC de prueba. Una compra de 0,50 deja 19,50 de saldo y 0,00 disponibles para el agente. Los campos de importe son cadenas enteras en unidades mínimas. El activo tiene 7 decimales y 0,50 equivale a `"5000000"`.

```sh
pnpm --filter @tilcai-wallet/api-contracts --silent openapi
```

## Rutas

| Método y ruta | Scope | Respuesta |
| --- | --- | --- |
| `GET /v1/sessions/{sessionId}` | `sessions:read` | Sesión ligada a su tarjeta. |
| `GET /v1/cards/{cardId}` | `cards:read` | Saldo, topes, gasto y disponible para el agente. |
| `POST /v1/orders` | `orders:write` | `202` para una orden aceptada. `200` con la orden existente al repetirla. |
| `GET /v1/orders/{orderId}` | `orders:read` | Estado actual y `receiptId` cuando exista. |
| `GET /v1/receipts/{receiptId}` | `receipts:read` | Orden, pago, entrega y reembolso con estados separados. |

La API debe resolver tenant, actor y sesión desde el token Bearer y verificar el vínculo al recurso en cada operación. Un ID por sí solo carece de autoridad. En la oferta fija `test-report`, el backend resuelve activo, destinatario y precio. La solicitud admite solo `cardId`, `offerId` y `maxAmountMinor`. La compra necesita `Idempotency-Key`; los clientes conservan la clave original para repetir la misma orden. Reusar una clave con otro contenido devuelve `409 idempotency_conflict`. Una operación distinta sin presupuesto devuelve `409 limit_exceeded`. Ambas devuelven `{ "error": { "code": "…" } }`. Los demás errores son `400 invalid_request`, `401 unauthenticated`, `403 forbidden`, `404 not_found`, `429 rate_limited` y `503 service_unavailable`.

El pago pendiente puede traer un hash. El pago confirmado exige hash y ledger. Se consulta el mismo intento cuando la respuesta es incierta. El recibo lleva `mode: "fixture"` o `mode: "testnet"`. Los hashes en fixtures son ilustrativos y la interfaz debe rotularlos como datos de prueba. Un recibo observado en Testnet se vincula al hash confirmado y a la orden de la aplicación.

## Stellar Testnet y entrega

- **Activo.** USDC de Circle en Stellar Testnet. Emisor `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` y contrato de activo `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`. [Circle](https://developers.circle.com/stablecoins/usdc-contract-addresses#testnet)
- **Firmas y destino.** El dueño configura y fondea una instancia nueva con un firmante delegado de Testnet y un tope de `5000000`. Para `test-report`, usar como destino de prueba `GAGK4SEOVSZDQXSBMO6KMUHNH36B3E2AZFDINVDFVRVV2ZYLP577OSHX`, el beneficiario acreditado en el #5. El backend autoriza `spend(5000000)` con el delegado, y compara el activo y el beneficiario en `policy()` con la oferta. Conserva las claves en la configuración privada del backend. [Interfaz de Soroban](../contracts/soroban/README.md) · [Efectos de la transferencia del #5](https://horizon-testnet.stellar.org/transactions/0f624b09c43169743b81deacf956f3415dc5feef87ddb61fdd52f676a76143d8/effects)
- **Consulta.** Guarda hash e intento antes de enviar. Consulta el mismo hash con Stellar RPC hasta reconciliar el resultado. Usa una instancia separada para el recorrido de punta a punta, ya que la instancia de la prueba de contratos agotó su límite inicial. [Persistencia](persistence.md)
- **Proveedor de prueba.** Si Vector52 queda pendiente, usa `demo-report-provider` como identificador. Para registrar entrega debe encontrar una transacción confirmada en Testnet y comprobar que su transferencia coincide en contrato del activo, cuenta de origen, destinatario e importe con la orden. Vincula el hash a una sola orden y emite una única evidencia de entrega con un ID estable y SHA-256 del informe de prueba. El hash por sí solo acredita una transacción. La evidencia del proveedor acredita la entrega.

## Arranque local

Desde la raíz del monorepo y con la versión de Node indicada en `.node-version`:

```sh
pnpm install --frozen-lockfile
node --env-file=.env --import tsx services/api/src/main.ts
node --env-file=.env --import tsx services/worker/src/worker.ts
pnpm --filter @tilcai-wallet/web dev
pnpm --filter @tilcai-wallet/mcp start
```

Copia `.env.example` a `.env` si todavía no existe. Los comandos de API y PWA van en terminales separadas. El worker base comprueba la configuración y, hasta integrar el #6, la API expone únicamente `/healthz`. Para el backend integrado, configura `DATABASE_URL` con la cadena del panel **Connect → Session pooler** del proyecto Supabase de Testnet. Usa el puerto `5432`, TLS y la contraseña codificada en la URI. La cadena completa pertenece al servicio privado. [Conexión a Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres) · [Contraseñas en URI](https://supabase.com/kb/troubleshooting/fatal-password-authentication-failed)

Los clientes pueden integrar las vistas con `demoWallet`: `cardBefore`, `createOrder`, `orderPending`, `orderDelivered`, `cardAfter`, `receipt` y `limitExceeded`. Para el corte real, la compra depende del API y worker integrados y de una instancia fondeada con los permisos del firmante.
