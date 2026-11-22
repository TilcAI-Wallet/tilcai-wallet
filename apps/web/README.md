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

## Wallet simulada: recorrido completo

Todo funciona de punta a punta con un estado simulado en memoria del servidor (se pierde al reiniciar). La sesión es una cookie `tilcai_session`; sin ella, `/wallet/*` redirige a `/connect`.

- **Entrada:** `/` bienvenida → `/connect` (passkey, llave privada, frase de recuperación o dispositivo) → `/wallet`.
  - **Passkey:** usa WebAuthn real del dispositivo (Windows Hello, Touch ID, huella…). El servidor aún no emite el desafío ni verifica la firma. Sin soporte del navegador se simula y la pantalla lo dice.
  - **Llave privada:** valida el formato y el checksum Stellar (`S…`, 56 caracteres) en el cliente. No se envía ni se guarda.
  - **Frase de recuperación:** 12 o 24 palabras, con pegado en bloque. Solo valida la forma; no hay lista BIP-39 ni checksum.
  - **Dispositivo:** código y patrón tipo QR simulados; vincula solo a los 6 s. El patrón no es un QR escaneable.
- **Inicio** `/wallet`: saldo, acciones rápidas, actividad y campana con contador de avisos.
- **Fondear** `/wallet/fund` · **Transferir** `/wallet/transfer` (valida dirección y saldo, muestra red, destino, monto y comisión, y pide passkey) · **Recibir** `/wallet/receive` (copiar y compartir).
- **Actividad** `/wallet/activity` (filtros y detalle) · **Notificaciones** (aprobar o rechazar el aumento de tope de Codex) · **Sesiones** (terminar y reanudar) · **Agentes** (pausar, conectar) · **Tarjetas** `/wallet/cards` (congelar y reanudar, recibo en Testnet).
- **Perfil** (renombrar, cerrar sesión) y **Ajustes** (ocultar saldos, avisos, pedir passkey al enviar, restablecer la demo).

Direcciones, claves y símbolos como XLM se muestran en monoespaciada: en Bargain las mayúsculas X e Y se ven intercambiadas, y en una dirección eso engaña.

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
