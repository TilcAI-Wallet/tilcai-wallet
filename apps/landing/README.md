# Landing

Página pública del proyecto. Explica el producto y lleva al piloto. El panel con sesiones, tarjetas y passkeys vive en [`apps/web`](../web/README.md).

`pnpm --filter @tilcai-wallet/landing dev` arranca en http://localhost:3001. `pnpm --filter @tilcai-wallet/landing build` genera HTML estático en `out/`, listo para cualquier hosting estático.

La portada vive en `src/app/landing-hero.tsx` y usa el logotipo, los colores y la tipografía de la guía de marca V5.0. El recibo animado de `src/app/printed-receipt.tsx` muestra una compra ilustrativa de 5 USDC en Stellar Testnet.

La copia de Bargain se carga desde `public/brand/bargain.otf` cuando está presente. El archivo se mantiene fuera de Git y la compilación usa Schibsted Grotesk si falta. Para un despliegue con Bargain, usa la copia cubierta por la [licencia web de Sensatype](https://www.sensatype.com/license).

Los grabados de Claude Code, Codex, OpenCode y Grok Bot vienen de la sección Stack del [portafolio de Omar](https://github.com/OmarQV/omidev). Los tres primeros usan geometrías de [Lobe Icons](https://github.com/lobehub/lobe-icons). La versión de Grok Bot del portafolio es un trazado. Las marcas pertenecen a sus respectivos titulares. [Licencia MIT](public/brand/lobe-icons-license.txt)

`#como-funciona` recorre tarjeta, límite, compra y recibo con una escena de celular. El panel fijo avanza con el scroll del navegador. Con movimiento reducido, en pantallas bajas y sin JavaScript se leen los cuatro pasos en orden. Ambos ejemplos de la landing comparten los importes de `src/app/story/demo-purchase.ts`.

- [ ] Reemplazar el enlace del piloto por un formulario o correo del equipo.
- [ ] Añadir capturas o video de la demo cuando el flujo en testnet esté listo.
- [ ] Elegir dominio y hosting.
