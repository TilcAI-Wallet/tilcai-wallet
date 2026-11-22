# MCP

Servidor propio de TilcAI Wallet con SDK TypeScript v2. `pnpm --filter @tilcai-wallet/mcp start` inicia stdio. Stdout está reservado al protocolo.

- [x] Exponer consulta de tarjeta, creación y seguimiento de orden y lectura de recibo.
- [x] Probar stdio contra respuestas HTTP de prueba, incluida la repetición de la misma orden.
- [ ] Probar aislamiento de tenants, caducidad, cuotas e idempotencia con la API integrada.
- [ ] Incorporar solicitud de aumento.
- [ ] Diseñar Streamable HTTP con autenticación y probar cada cliente.
- [ ] Recordar que la solicitud de aumento no otorga autoridad para aprobarlo.

## Conexión local

Configura `WALLET_API_URL` para la API de prueba, `WALLET_MCP_CARD_ID` para la tarjeta y `WALLET_MCP_TOKEN` con un token de sesión emitido por el backend de Testnet. El token requiere `cards:read`, `orders:write`, `orders:read` y `receipts:read`. Configúralo como secreto del entorno local del cliente MCP. Sin token o tarjeta, el servidor se identifica y la lista de herramientas queda vacía.

La compra recibe `offerId`, `maxAmountMinor` e `idempotencyKey`. Para la oferta de prueba usa `test-report` y `"5000000"`. Si hay un timeout, conserva la misma clave o consulta la orden existente. Una clave nueva identifica una orden nueva. El estado del pago y la entrega se consultan en el recibo. La respuesta indica si proviene de Testnet o de fixtures.

```sh
pnpm --filter @tilcai-wallet/tests test
```

[Contrato API v1 y entorno](../../docs/demo-api.md) · [Guion de la demo](../../docs/demo.md)
