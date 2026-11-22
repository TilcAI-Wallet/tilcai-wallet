# Soroban

Este Cargo workspace contiene un contrato de ejemplo que devuelve su versión. Para trabajar aquí instala Rust y Stellar CLI 30.0.1.

~~~sh
cd contracts/soroban
cargo test --workspace --lib --locked
stellar contract build --locked
~~~

Stellar CLI compila para `wasm32v1-none`. Revisa compatibilidad del SDK y la red antes de desplegar. [Stellar CLI](https://developers.stellar.org/docs/tools/cli) · [Soroban SDK](https://github.com/stellar/rs-soroban-sdk)

- [ ] Seleccionar cuenta y factory a partir de una prueba con passkey.
- [ ] Diseñar el alcance para activo, beneficiario, transferencia y vigencia.
- [ ] Implementar contador acumulado que se conserva al editar límites o rotar acceso.
- [ ] Probar firma directa con el delegado, revocación, restauración y retiro.
- [ ] Probar tope y transferencia atómicos, autorización expirada, cambio de destino, gastos simultáneos y contador tras restaurar.

La primera entrega aplica controles de gasto en Soroban y unicidad de orden en la ruta coordinada por la aplicación. [Evidencia contractual](../../docs/validation.md#primer-corte-en-stellar-testnet)

## Investigación poscuántica

En curso. Usar un entorno de prueba con Protocolo 30 y verificar desde `__check_auth` una autorización ML-DSA-44 para una transferencia de 0,50 USDC de prueba. Contrastar el costo con la ruta clásica y conservar hashes y rechazos del contrato. [Tarea delegable, versiones y criterios](../../docs/research/post-quantum.md#tarea-delegable)
