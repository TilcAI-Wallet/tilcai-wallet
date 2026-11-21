# MCP

Servidor propio de TilcAI Wallet con SDK TypeScript v2. `pnpm --filter @tilcai-wallet/mcp start` inicia stdio. Un cliente MCP comprueba el handshake; stdout está reservado al protocolo.

- [ ] Resolver sesión lógica y tarjeta a partir de credencial autenticada.
- [ ] Incorporar consulta de presupuesto, compra, solicitud de aumento y recibo.
- [ ] Probar aislamiento de tenants, caducidad, cuotas e idempotencia.
- [ ] Diseñar Streamable HTTP con autenticación y probar cada cliente.
- [ ] Recordar que la solicitud de aumento no otorga autoridad para aprobarlo.
