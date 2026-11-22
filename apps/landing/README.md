# Landing

Página pública del proyecto. Explica el producto y lleva al piloto. El panel con sesiones, tarjetas y passkeys vive en [`apps/web`](../web/README.md).

`pnpm --filter @tilcai-wallet/landing dev` arranca en http://localhost:3001. `pnpm --filter @tilcai-wallet/landing build` genera HTML estático en `out/`, listo para cualquier hosting estático.

La portada vive en `src/app/landing-hero.tsx` y usa el logotipo, los colores y la tipografía de la guía de marca V5.0. El recibo animado muestra la compra de demostración de 5,00 USDC, con 20,00 USDC iniciales y 15,00 USDC restantes. La [transferencia de 0,50 USDC en Stellar Testnet](https://stellar.expert/explorer/testnet/tx/0f624b09c43169743b81deacf956f3415dc5feef87ddb61fdd52f676a76143d8) corresponde a la evidencia de una prueba anterior.

La copia de Bargain se carga desde `public/brand/bargain.otf` cuando está presente. El archivo se mantiene fuera de Git y la compilación usa Schibsted Grotesk si falta. Para un despliegue con Bargain, usa la copia cubierta por la [licencia web de Sensatype](https://www.sensatype.com/license).

Los grabados de Claude Code, Codex, OpenCode y Grok Bot vienen de la sección Stack del [portafolio de Omar](https://github.com/OmarQV/omidev). Los tres primeros usan geometrías de [Lobe Icons](https://github.com/lobehub/lobe-icons). La versión de Grok Bot del portafolio es un trazado. Las marcas pertenecen a sus respectivos titulares. [Licencia MIT](public/brand/lobe-icons-license.txt)

`#como-funciona` recorre tarjeta, límite, compra y recibo con capturas de la [PWA](https://tilcai-wallet-pwa.vercel.app/) generadas desde `apps/web` y adaptadas al recorrido de 5,00 USDC. Las capturas se publican como WebP en `public/brand/pwa/`. El panel fijo avanza con el scroll del navegador. Con movimiento reducido, en pantallas bajas y sin JavaScript se leen los cuatro pasos en orden. `src/app/story/demo-purchase.ts` reúne los importes del recorrido.

`#canales` reproduce nueve escenas con el mismo mecanismo de scroll. WhatsApp muestra el patrón de [respuestas rápidas de Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/interactive-reply-buttons-messages) y Telegram el [menú inline de un bot](https://core.telegram.org/bots/api#inlinekeyboardmarkup). Las terminales muestran cómo instalar dependencias, registrar el [MCP del monorepo](../mcp/README.md) y consultar la tarjeta con `get_card`. El CLI muestra `health` y una vista previa TUI del saldo. Las escenas del navegador y celular reutilizan capturas de la PWA. Los símbolos de WhatsApp y Telegram proceden de [Simple Icons](https://github.com/simple-icons/simple-icons).

`#piloto` vive en `src/app/pilot-section.tsx`: a quién busca el piloto, las condiciones y el precio previsto (primera tarjeta gratis y US$4 al mes por tarjeta activa adicional). Los botones abren la PWA y el repositorio.

- [ ] Reemplazar el enlace del piloto por un formulario o correo del equipo.
- [x] Mostrar las capturas de la PWA y el recorrido de compra de 5,00 USDC.
- [ ] Elegir dominio y hosting.
