# Soroban

El workspace contiene un **prototipo local** de una cuenta de fondos retenidos por contrato con política de gasto. Su interfaz puede servir para iniciar la integración de la issue [#5](https://github.com/TilcAI-Wallet/tilcai-wallet/issues/5); el contrato fue desplegado y se verificó el primer pago en Testnet. No usar con fondos reales antes de revisar seguridad, recuperación, expiración y restauración.

## Interfaz provisional

`WalletFoundation` se crea con `__constructor(owner, agent, asset, recipient, max_per_payment, limit)`. El dueño autoriza la creación. Todos los importes son enteros en las unidades mínimas del token; para un token de 7 decimales, 0,50 corresponde a `5_000_000` y 20 a `200_000_000`. El caso usa USDC de Circle en Stellar Testnet, con 7 decimales.

- `policy()` devuelve dueño, agente, activo, destinatario, máximo por pago, límite acumulado, gasto y estado de congelación.
- `spend(amount: i128, recipient: Address, expected_policy_revision: u64)` exige autorización del agente sobre los tres argumentos. El contrato compara `recipient` y `expected_policy_revision` con el estado vigente antes de transferir el activo configurado. Rechaza con `PolicyChanged` (5) si no coinciden. Aplica importe positivo, máximo y límite acumulado; el contador y la transferencia se revierten juntos si falla la invocación.
- `set_policy(agent, recipient, max_per_payment, limit, frozen)` exige autorización del dueño y conserva el gasto acumulado, también al rotar el agente. El nuevo límite no puede quedar por debajo del gasto. Cada llamada exitosa incrementa la revisión, incluso si no cambia valores; un desbordamiento devuelve `RevisionOverflow` (6) sin modificar la política.
- `withdraw(to, amount)` exige autorización del dueño y devuelve el activo configurado. No aumenta ni reinicia el presupuesto del agente.
- `policy_state()` devuelve `(Policy, u64)` con la política y su revisión en una misma invocación. `policy_revision()` devuelve solo la revisión, inicialmente 0.
- `version()` devuelve `2`.

La cuenta es un contrato de custodia con una función de transferencia restringida: **no implementa la interfaz de smart account `__check_auth` ni autoriza llamadas Soroban arbitrarias**. El activo es inmutable y el destinatario firmado debe coincidir con la política. La unicidad comercial de una orden aún corresponde a la ruta coordinada por la aplicación.

## Validación y pendientes

El adaptador debe leer `policy_state()` en una sola invocación, validar activo, destinatario, agente y presupuesto contra la compra, y construir y firmar la invocación exacta `spend(amount, recipient, expected_policy_revision)`. La revisión puede cambiar después de esa lectura o después de firmar: en ese caso el contrato rechaza la operación; hay que volver a leer, validar y obtener una nueva autorización. No sustituir argumentos de una autorización ya firmada. `amount` está en unidades atómicas (0,50 USDC = `5000000`), `recipient` es una dirección Soroban y la revisión es `u64`.

Los pagos con la misma revisión pueden competir por el presupuesto: cada ejecución comprueba el `spent` actualizado y solo se confirma si queda límite; el orden de inclusión no está garantizado. La revisión cambia únicamente con `set_policy`, no con cada pago. Las operaciones fallidas no consumen presupuesto. Soroban protege la autorización frente a reutilización mediante su mecanismo de nonce y vencimiento; la idempotencia comercial de una orden sigue siendo responsabilidad del backend.

**Cambio incompatible:** clientes de v1 y sobres ya firmados con `spend(amount)` no funcionan con v2. La instancia Testnet histórica indicada abajo sigue ejecutando v1 y no queda protegida por este código; no habilitar pagos allí. El contrato no expone actualización de código: se requiere una instancia v2 nueva y coordinar dirección, fondos y política antes de integrar el PR #12. No se despliega automáticamente.

Las pruebas unitarias usan token y autorizaciones simuladas. Cubren argumentos autorizados, cambios de política, presupuesto, congelación y reversión; la competencia se modela con ejecuciones ordenadas, no con una prueba de red concurrente. Quedan pendientes las pruebas de integración, TTL/restauración y Testnet con una instancia v2. La política no tiene caducidad ni revocación irreversible; no hay manejo de otros activos enviados accidentalmente al contrato.

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

Los comandos anteriores son evidencia histórica de v1 y no se deben aplicar a una instancia v2. Para v2, consultar la revisión y proporcionar los tres argumentos documentados arriba. El contrato no implementa caducidad ni la interfaz `__check_auth`. La aprobación por passkey, el proveedor y el recibo aún no están integrados.

## Investigación poscuántica

En curso y separada del prototipo: verificar desde `__check_auth` una autorización ML-DSA-44 en una subcuenta aislada y contrastar el costo con la ruta clásica. [Tarea delegable](../../docs/research/post-quantum.md#tarea-delegable)
