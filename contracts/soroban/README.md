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
