# Solana y protocolos de pago para agentes

## ¿Qué productos y servicios comparables existen?

### Takeaway
Crossmint es el competidor más cercano por sus wallets de agente con permisos y por declarar soporte de Stellar y Solana. En Solana, Pay.sh y PayAI compiten principalmente en acceso y liquidación de servicios, y también pueden complementar una wallet.

### Cited Findings
- Crossmint ofrece wallets no custodiales para agentes con límites, destinos permitidos y expiración aplicados on-chain; anuncia pagos x402/MPP, recarga con tarjeta o stablecoins y una API que incluye Solana, Base y Stellar. [Crossmint Agent Wallets](https://www.crossmint.com/products/agentic-wallets).
- Crossmint explica que construyó contratos de smart account propios para Solana y Stellar. [Crossmint Wallets, 11 de noviembre de 2026](https://www.crossmint.com/announcement/reintroducing-crossmint-wallets).
- Pay.sh reúne catálogo de APIs y proxy sobre Google Cloud, utiliza una wallet Solana y admite pagos por llamada; afirma utilizar x402 y MPP y liquidación con stablecoins en Solana. [Anuncio de Solana Foundation](https://solana.com/uk/news/solana-foundation-launches-pay-sh-in-collaboration-with-google-cloud).
- PayAI se describe como facilitador de producción x402: verifica y liquida pagos y ofrece descubrimiento de servicios; opera sobre Solana y varias redes EVM, no custodia saldos del vendedor, y no ofrece checkout con tarjetas ni transferencias bancarias. [PayAI About](https://facilitator.payai.network/about), [PayAI Facilitator](https://facilitator.payai.network/).
- PayAI anunció el 22 de octubre de 2026 liquidación x402 por lotes en Solana: depósitos USDC, vouchers por solicitud y cobros periódicos, con costes y límites aplicables. BlockRun documenta uso opcional en una parte de sus llamadas y confianza explícita en el operador. [PayAI](https://blog.payai.network/x402-batch-settlement-is-live-on-solana-pay-per-call-settle-once/).
- El resumen de ecosistema de Solana de octubre menciona LanaTools como conexión MCP con permisos de agente, límites de gasto y pagos x402/MPP; no se verificó independientemente su diseño o despliegue. [Solana Foundation](https://solana.com/es/news/solana-ecosystem-roundup-october-2026).

### Inferences
- Crossmint merece evaluación prioritaria como competidor directo y posible proveedor alternativo: se parece a la tarjeta por sesión prevista, aunque su arquitectura, cobertura regional y todos los controles concretos requieren pruebas específicas en Stellar.
- Pay.sh es competencia por distribución y catálogo de proveedores; PayAI es infraestructura de liquidación y posible socio, no un reemplazo demostrado del control del dueño o del ciclo completo de recibos de TilcAI.
- La evidencia disponible no demuestra que el recibo de ninguno vincule permiso, orden, pago y entrega como propone TilcAI.

### Gaps
- No se comprobó funcionalmente ninguna solución ni se encontraron garantías auditadas de las capacidades de Crossmint específicamente en Stellar; disponibilidad en Bolivia y costes por método deben comprobarse.
- La fuente de LanaTools no detalla custodia, alcance de enforcement ni condiciones de disponibilidad.

## ¿Qué aportan x402, MPP y los canales de pago?

### Takeaway
Son protocolos y componentes de infraestructura, no productos equivalentes a una wallet administrada para agencias. Sirven para conectar agentes y proveedores que exponen recursos pagados.

### Cited Findings
- Según documentación de Solana, x402 usa cabeceras PAYMENT-REQUIRED, PAYMENT-SIGNATURE y PAYMENT-RESPONSE; MPP usa WWW-Authenticate: Payment, Authorization: Payment y Payment-Receipt. MPP contempla cobros y sesiones medidas; compatibilidad x402 y esquemas depende de red y cliente. MCP expone herramientas, mientras x402 o MPP pueden cobrar por ellas. [Solana Agentic Payments](https://solana.com/docs/payments/agentic-payments).
- Los canales de Solana descritos por Solana Foundation depositan un techo, registran autorizaciones firmadas fuera de cadena y liquidan después, devolviendo sobrante. Reducen operaciones on-chain para consumo repetido, pero exigen apertura, liquidación y cierre y no son una prueba de que el mismo mecanismo exista en Stellar. [Solana Payment Channels](https://solana.com/news/payment-channels-1-million-payments-per-second).
- PayAI señala que la disponibilidad por versión, esquema y red debe verificarse en su endpoint de capacidades; en esquemas de canal, la aceptación del voucher no necesariamente equivale a pago final. [PayAI](https://payai.network/), [API del facilitador](https://facilitator.payai.network/).

### Inferences
- Una integración Stellar debe evaluarse por combinación concreta de contrato, esquema, red, SDK, facilitador y política de gasto, no inferirse de la marca x402 o MPP.
- El recibo de TilcAI debería distinguir autorización, confirmación de liquidación y evidencia independiente de entrega, en especial cuando exista pago diferido o por lotes.

### Gaps
- No se comprobó soporte de un flujo Stellar con smart account Soroban y estos protocolos extremo a extremo.
