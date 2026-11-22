# Web (PWA móvil del dueño)

PWA para que el dueño siga el pago de su agente y abra el recibo. Todo el trabajo vive en este módulo.

## Arranque

```sh
pnpm install
pnpm --filter @tilcai-wallet/web dev     # http://localhost:3000
```

Los scripts usan Webpack. En la verificación en Windows, el worker de PostCSS de Turbopack se cerró antes de conectarse al compilador.

## Datos simulados

Mientras no exista la Wallet API, las páginas leen un cliente simulado (`src/lib/wallet.ts` + `src/lib/wallet-mock.ts`) y lo etiquetan como **Datos simulados**. Escenario: tarjeta Codex · Portátil con 20,00 USDC y tope 0,50. Tras el pago de 0,50 quedan 19,50 y el agente dispone de 0,00.

```sh
curl -X POST http://localhost:3000/api/mock/pay     # pasa de "antes" a "después"
curl -X POST http://localhost:3000/api/mock/reset   # vuelve a "antes"
```

Recibos de prueba: `/receipts/rcp_demo_paid`, `/receipts/rcp_demo_pending`, `/receipts/rcp_demo_failed` y `/receipts/rcp_demo_error` (simula una API caída). El hash del pago confirmado es el de la transferencia real de 0,50 USDC en Testnet (ledger 5859035); la orden y la entrega siguen simuladas.

Al existir la API, solo `src/lib/wallet.ts` cambia: mismos métodos (`session`, `card`, `receipt`) y mismos tipos.

## Instalación PWA

El manifiesto está en `src/app/manifest.ts` con iconos 192/512 y maskable. Instalar exige HTTPS salvo en `localhost`: para probar en un celular usa `pnpm --filter @tilcai-wallet/web exec next dev --webpack --experimental-https` o un túnel HTTPS. No hay service worker: la instalación solo necesita manifiesto y HTTPS, y el modo offline queda fuera de este corte.

Capturas del recorrido a 390×844 en [`evidence/`](./evidence).

## Pendiente

- [ ] Implementar alta, recuperación, sesión y passkeys (hoy la sesión es simulada).
- [ ] Sustituir el cliente simulado por la API real y repetir el recorrido sobre Testnet.
- [ ] Comprobar que el recibo coincide con el de MCP cuando ambos consuman la API.
- [ ] Añadir la aprobación de aumento con la versión confirmada de la política.
- [ ] Estado offline de la PWA.
