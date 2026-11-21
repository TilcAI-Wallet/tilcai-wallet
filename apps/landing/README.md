# Landing

Página pública del proyecto. Explica el producto y lleva al piloto. El panel con sesiones, tarjetas y passkeys vive en [`apps/web`](../web/README.md).

`pnpm --filter @tilcai-wallet/landing dev` arranca en http://localhost:3001. `pnpm --filter @tilcai-wallet/landing build` genera HTML estático en `out/`, listo para cualquier hosting estático.

Todo el contenido está en `src/app/page.tsx`. Los colores siguen la paleta de `packages/config`.

- [ ] Reemplazar el enlace del piloto por un formulario o correo del equipo.
- [ ] Añadir capturas o video de la demo cuando el flujo en testnet esté listo.
- [ ] Elegir dominio y hosting.
