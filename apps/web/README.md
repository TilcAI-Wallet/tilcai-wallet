# Web

`pnpm --filter @tilcai-wallet/web dev` arranca Next.js y `pnpm --filter @tilcai-wallet/web build` comprueba el bundle. El App Router vive en `src/app`.

Los scripts usan Webpack. En la verificación en Windows, el worker de PostCSS de Turbopack se cerró antes de conectarse al compilador.

- [ ] Implementar alta, recuperación, sesión y passkeys.
- [ ] Desarrollar saldo, fichas de sesión, tarjeta, extracto y recibo.
- [ ] Añadir la aprobación de aumento con la versión confirmada de la política.
- [ ] Verificar requisitos de instalación, iconos y estado offline de la PWA.
