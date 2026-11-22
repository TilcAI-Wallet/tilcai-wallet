# Landing

Página pública del proyecto. Explica el producto y lleva al piloto. El panel con sesiones, tarjetas y passkeys vive en [`apps/web`](../web/README.md).

`pnpm --filter @tilcai-wallet/landing dev` arranca en http://localhost:3001. `pnpm --filter @tilcai-wallet/landing build` genera HTML estático en `out/`, listo para cualquier hosting estático.

La portada vive en `src/app/landing-hero.tsx` y usa el logotipo, los colores y la tipografía de la guía de marca V5.0. El recibo animado enlaza a la [transferencia de 0,50 USDC en Stellar Testnet](https://stellar.expert/explorer/testnet/tx/0f624b09c43169743b81deacf956f3415dc5feef87ddb61fdd52f676a76143d8). El permiso, la orden y la entrega del informe pertenecen al flujo de demostración de la PWA.

La copia de Bargain se carga desde `public/brand/bargain.otf` cuando está presente. El archivo se mantiene fuera de Git y la compilación usa Schibsted Grotesk si falta. Para un despliegue con Bargain, usa la copia cubierta por la [licencia web de Sensatype](https://www.sensatype.com/license).

Los grabados de Claude Code, Codex, OpenCode y Grok Bot vienen de la sección Stack del [portafolio de Omar](https://github.com/OmarQV/omidev). Los tres primeros usan geometrías de [Lobe Icons](https://github.com/lobehub/lobe-icons). La versión de Grok Bot del portafolio es un trazado. Las marcas pertenecen a sus respectivos titulares. [Licencia MIT](public/brand/lobe-icons-license.txt)

`#como-funciona` recorre tarjeta, límite, compra y recibo con capturas de la [PWA](https://tilcai-wallet-pwa.vercel.app/) generadas desde `apps/web` con el perfil de prueba. Las capturas se publican como WebP en `public/brand/pwa/`. El panel fijo avanza con el scroll del navegador. Con movimiento reducido, en pantallas bajas y sin JavaScript se leen los cuatro pasos en orden. Los importes y el enlace al ledger se comparten desde `src/app/story/demo-purchase.ts`.

`#canales` reproduce nueve escenas con el mismo mecanismo de scroll. Las escenas del navegador y celular reutilizan capturas de la PWA. Chats y terminales son recreaciones visuales. Los pasos MCP reflejan las herramientas locales del [servidor MCP](../mcp/README.md). Cada canal indica el estado de su integración. Los símbolos de WhatsApp y Telegram proceden de [Simple Icons](https://github.com/simple-icons/simple-icons).

- [ ] Reemplazar el enlace del piloto por un formulario o correo del equipo.
- [x] Mostrar las capturas de la PWA y enlazar la transferencia de Testnet.
- [ ] Elegir dominio y hosting.
