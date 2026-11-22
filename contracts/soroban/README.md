# Soroban

El workspace contiene un **prototipo local** de una cuenta de fondos retenidos por contrato con política de gasto. Su interfaz puede servir para iniciar la integración de la issue [#5](https://github.com/TilcAI-Wallet/tilcai-wallet/issues/5); el contrato fue desplegado y se verificó el primer pago en Testnet. No usar con fondos reales antes de revisar seguridad, recuperación, expiración y restauración.

## Interfaz provisional

`WalletFoundation` se crea con `__constructor(owner, agent, asset, recipient, max_per_payment, limit)`. El dueño autoriza la creación. Todos los importes son enteros en las unidades mínimas del token; para un token de 7 decimales, 0,50 corresponde a `5_000_000` y 20 a `200_000_000`. El caso usa USDC de Circle en Stellar Testnet, con 7 decimales.

- `policy()` devuelve dueño, agente, activo, destinatario, máximo por pago, límite acumulado, gasto y estado de congelación.
- `spend(amount)` exige autorización del agente y transfiere el activo configurado únicamente al destinatario configurado. Aplica importe positivo, máximo y límite acumulado; el contador y la transferencia se revierten juntos si falla la invocación.
- `set_policy(agent, recipient, max_per_payment, limit, frozen)` exige autorización del dueño y conserva el gasto acumulado, también al rotar el agente. El nuevo límite no puede quedar por debajo del gasto.
- `withdraw(to, amount)` exige autorización del dueño y devuelve el activo configurado. No aumenta ni reinicia el presupuesto del agente.
- `version()` devuelve `1`.

La cuenta es un contrato de custodia con una función de transferencia restringida: **no implementa la interfaz de smart account `__check_auth` ni autoriza llamadas Soroban arbitrarias**. El control de destino y activo se deriva de los valores de la política, no de argumentos aportados por el agente. La unicidad comercial de una orden aún corresponde a la ruta coordinada por la aplicación.

## Validación y pendientes

Las pruebas locales se ejecutaron con Rust 1.99.1 y SDK 29.0.1. La compilación Wasm pasó con Stellar CLI 28.1.0; todavía debe repetirse con las versiones fijadas por el proyecto. Las pruebas cubren el escenario de 20 unidades fondeadas, un gasto de 0,50, rechazo del siguiente gasto, rotación sin reiniciar el contador, congelación, firmas requeridas y reversión ante fallo del token. Estas pruebas unitarias usan un token de pruebas y autorizaciones simuladas; no prueban concurrencia ni restauración. La prueba adicional en Testnet descrita abajo usa USDC de prueba y claves reales de Testnet.

Pendiente: repetir compilación y despliegue con las versiones fijadas; probar restauración/TTL, caducidad, seguridad del ciclo de vida, concurrencia y garantías de la cuenta. La política no tiene caducidad ni revocación irreversible; la congelación y la rotación son controles iniciales. No hay manejo de otros activos enviados accidentalmente al contrato.

```sh
cd contracts/soroban
cargo test --workspace --lib --locked
stellar contract build --locked
```

El proyecto fija Rust en `rust-toolchain.toml`, Soroban SDK 29.0.1 y Stellar CLI 30.0.1. La compatibilidad de versiones y red debe verificarse antes de desplegar. [Evidencia contractual](../../docs/validation.md#primer-corte-en-stellar-testnet) · [Stellar CLI](https://developers.stellar.org/docs/tools/cli)

## Evidencia de Testnet · issue #5

La red confirmó una operación de 0,50 USDC de prueba en el ledger **5859035** ([transacción](https://stellar.expert/explorer/testnet/tx/0f624b09c43169743b81deacf956f3415dc5feef87ddb61fdd52f676a76143d8)). Se depositaron 20 USDC y luego se consultaron 19,50 USDC de saldo en el contrato. Una invocación directa adicional de `spend(1)` fue rechazada en la simulación RPC con `Error(Contract, #2)` (`LimitExceeded`); no se envió una transacción fallida. Los 19,50 USDC son únicamente de prueba y permanecen en el contrato.

- Emisor USDC Testnet: `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`.
- Contrato de activo USDC (SAC): `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`.
- [Contrato de política](https://lab.stellar.org/r/testnet/contract/CDCSGJZCHL5SOYURXLZ6YZQGWIOFN3FDREKJ27LGPPPCFJRIPPLIVLT6): `CDCSGJZCHL5SOYURXLZ6YZQGWIOFN3FDREKJ27LGPPPCFJRIPPLIVLT6`.
- [Despliegue](https://stellar.expert/explorer/testnet/tx/946742e70ee59e81f3267b725c11a0da16f04f183deaa706703eeef848595b16), ledger 5859014; [fondeo de 20 USDC](https://stellar.expert/explorer/testnet/tx/1437898559b9749b77ad2152db62eea2b09065255a7b0e68105d80870f38ed82).

La cuenta dueña y el firmante del agente son identidades de Testnet separadas. Las claves se conservan fuera del repositorio. Para invocar se necesita un alias local válido para cada identidad; las opciones de red deben señalar siempre Testnet. Ejemplos (importes en unidades mínimas):

```sh
CONTRACT=CDCSGJZCHL5SOYURXLZ6YZQGWIOFN3FDREKJ27LGPPPCFJRIPPLIVLT6
USDC=CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA
stellar contract invoke --network testnet --source wallet-owner --id "$CONTRACT" --send no -- policy
stellar contract invoke --network testnet --source wallet-owner --id "$USDC" --send no -- balance --id "$CONTRACT"
stellar contract invoke --network testnet --source wallet-agent --id "$CONTRACT" --send no -- spend --amount 1
```

La última simulación se rechaza mientras no se amplíe el límite. Para reproducir el pago de 0,50 sin gastar el saldo restante de esta instancia, desplegar otra instancia con presupuesto propio y ejecutar `spend --amount 5000000` con su agente. El contrato no implementa caducidad ni la interfaz `__check_auth`. La aprobación por passkey, el proveedor y el recibo aún no están integrados.

## Investigación poscuántica

En curso y separada del prototipo: verificar desde `__check_auth` una autorización ML-DSA-44 en una subcuenta aislada y contrastar el costo con la ruta clásica. [Tarea delegable](../../docs/research/post-quantum.md#tarea-delegable)
