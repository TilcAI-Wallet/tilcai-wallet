# Stack verificado

Corte del 20 de noviembre de 2026. Las versiones directas están en los manifiestos. El lockfile único fija la resolución del workspace.

| Módulo | Base | Fuente oficial |
| --- | --- | --- |
| Desarrollo | Node.js 24.22.1 LTS, pnpm 10.33, TypeScript 6.0.3 | [Node.js](https://nodejs.org/en/about/previous-releases) · [Workspaces](https://pnpm.io/workspaces) |
| Web | Next.js 16.4.6, React 19.3.0 y Tailwind 4 | [App Router](https://nextjs.org/docs/app/getting-started/installation) · [Política LTS](https://nextjs.org/support-policy) |
| Nativo | Expo SDK 58, Expo Router 58, React Native 0.88.1 y React 19.3.0 | [Expo SDK 58](https://expo.dev/sdk/58) · [Monorepos](https://docs.expo.dev/guides/monorepos/) |
| Extensión | WXT 0.21.5 con React y Manifest V3 | [WXT](https://wxt.dev/guide/installation.html) · [Entrypoints](https://wxt.dev/guide/essentials/entrypoints.html) |
| MCP | SDK de servidor TypeScript 2.4.0 y stdio | [SDK v2](https://ts.sdk.modelcontextprotocol.io/v2/api/%40modelcontextprotocol/server/) |
| Telegram | grammY 1.46 y Mini App con React y Vite 8.3 | [grammY](https://grammy.dev/guide/getting-started) · [Mini Apps](https://core.telegram.org/bots/webapps) |
| Servicios | Fastify 5.12, Zod 4.6 y Node Test Runner | [Fastify](https://fastify.dev/docs/latest/Guides/Getting-Started/) · [Zod](https://zod.dev/) |
| Persistencia objetivo | Supabase Postgres para API y worker, Storage privado para entregables. Esquema, migraciones y pool pendientes. | [ADR 003](adr/003-supabase-persistence.md) · [Conexiones](https://supabase.com/docs/guides/database/connecting-to-postgres) |
| Stellar | JS SDK 17.4, Stellar CLI 30.0.1 y Soroban SDK 29.0.1 para wasm32v1-none | [SDKs](https://developers.stellar.org/) · [Rust SDK](https://github.com/stellar/rs-soroban-sdk) |
| Terminal | Commander 15 e Ink 8 | [Commander](https://github.com/tj/commander.js) · [Ink](https://github.com/vadimdemedes/ink) |

Node 24 sigue siendo LTS y coincide con la infraestructura TilcAI. TypeScript 6 y React 19.3.0 son los valores de la plantilla de Expo verificada. Se conserva esa versión de React en el catálogo. En Expo, instalar librerías nativas con `pnpm --filter @tilcai-wallet/mobile exec expo install <paquete>`.

Web y móvil fijan ESLint 9.39.5 por el rango de compatibilidad de los plugins de Next y Expo. El salto de lint a ESLint 10 requiere actualizar y validar sus configuraciones.

El pago directo es el riel de demo. Los issues [#3158](https://github.com/x402-foundation/x402/issues/3158) y [#3352](https://github.com/x402-foundation/x402/issues/3352) explican las pruebas que requiere x402 con smart accounts. MPP se evalúa por separado. [Stellar MPP](https://github.com/stellar/stellar-mpp-sdk)

**Prueba poscuántica · 21 de noviembre.** Para probar CAP-87, fijar un SDK Rust de Soroban compatible con Protocolo 30, Stellar CLI compatible y un firmante que implemente FIPS 204. Verificar las versiones y el protocolo del nodo antes de medir. Esta es la matriz de la prueba y la tabla anterior documenta las dependencias de la base. [Diseño del experimento](research/post-quantum.md) · [Guía de Bell](https://stellar.org/blog/developers/bell-protocol-30-upgrade-guide)
