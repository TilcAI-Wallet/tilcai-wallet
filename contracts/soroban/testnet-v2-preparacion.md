# Preparación de WalletFoundation v2 para la issue #6

Estado: preparación local; no se ha desplegado, fondeado ni ejecutado la compra. Coordinar explícitamente antes del despliegue, fondeo o cualquier operación de red que modifique estado. La instancia histórica `CDCSGJZCHL5SOYURXLZ6YZQGWIOFN3FDREKJ27LGPPPCFJRIPPLIVLT6` es v1 y no sirve para esta prueba.

## Parámetros propuestos para confirmar

| Campo | Valor o estado |
| --- | --- |
| Red | Stellar Testnet; verificar RPC y passphrase antes de firmar |
| Contrato nuevo | Pendiente de despliegue y confirmación; debe ser distinto de v1 |
| Interfaz | `version() == 2` y `policy_state()`; verificar en la instancia nueva |
| Owner | Dirección pública pendiente de acordar; debe controlar la autorización del constructor y la política |
| Agente | Dirección pública pendiente de acordar; el backend debe poder autorizar con ese firmante |
| USDC | SAC Testnet `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`; confirmar activo y red antes de usar |
| Destinatario | Propuesto para `test-report`: `GAGK4SEOVSZDQXSBMO6KMUHNH36B3E2AZFDINVDFVRVV2ZYLP577OSHX`; confirmar con el proveedor |
| Máximo por pago | Propuesta: `5000000` unidades atómicas = 0,50 USDC |
| Límite acumulado | Propuesta: `5000000` unidades atómicas = 0,50 USDC para una compra |
| Estado inicial esperado | `spent = 0`, `frozen = false`, revisión `0`; comprobar `policy_state()` en cadena |

No publicar claves privadas, semillas, sobres firmados ni configuración sensible. Owner, agente y pagador de comisiones deben acordarse junto con su custodia; no asumir que los alias locales existentes son apropiados.

## Preparación y coordinación

1. Confirmar con el equipo owner, agente, destinatario, límites, origen de USDC y pagador de comisiones. Reservar al menos 0,50 USDC de prueba para el contrato y XLM de Testnet suficiente para reservas y comisiones de las cuentas que operarán; estimar los recursos mediante simulación una vez elegidas las cuentas. El saldo de v1 no es saldo de v2.
2. Compilar y verificar el Wasm con la CLI fijada en CI (Stellar CLI 30.0.1), Rust fijado y `Cargo.lock`. Registrar commit, versión, hash y artefacto exacto. El 22 de noviembre la compilación local funcionó con CLI 28.1.0, pero no sustituye la verificación con la versión fijada.
3. Tras coordinar el despliegue, registrar hash de transacción, ledger, contract ID nuevo y enlace público. Consultar `version()` y `policy_state()` y comparar todos los campos con la tabla acordada antes de habilitar el backend.
4. Tras coordinar el fondeo, registrar hash y ledger, consultar saldo del contrato y recursos de las cuentas, y confirmar que alcanzan para la prueba. No iniciar la compra hasta coordinar su ejecución explícitamente.
5. El backend debe leer `policy_state()`, comprobar activo, destinatario, agente y presupuesto, y autorizar `spend(5000000, recipient, expected_policy_revision)`. Registrar después evidencia pública de pago y verificar el mismo recibo desde API, MCP y PWA conforme a la issue #6.

## Verificación local

En la preparación se ejecutó `cargo test --locked --offline`: 4 pruebas correctas. `stellar contract build --locked` con Stellar CLI 28.1.0 produjo un Wasm local con hash SHA-256 `f730f1f199c0778ec9432f6a9df2f4b45ece9ddb518439120f445d6cdafa2e4f`; es un artefacto preliminar, no evidencia de despliegue. Falta repetir el build con CLI 30.0.1 y verificar compatibilidad de red.
