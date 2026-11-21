# Extensión

`pnpm --filter @tilcai-wallet/extension build` produce `.output/chrome-mv3`. En Chromium se puede cargar esa carpeta como extensión sin empaquetar en modo desarrollador.

- [ ] Definir protocolo de vinculación y revisar el origen en cada mensaje.
- [ ] Solicitar permisos acotados a los sitios habilitados.
- [ ] Enviar las aprobaciones sensibles al dominio seguro de la wallet.
- [ ] Probar ciclos del service worker, revocación y revisión de tienda.
