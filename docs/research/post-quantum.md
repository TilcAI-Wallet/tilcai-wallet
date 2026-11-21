# Autorización poscuántica para tarjetas de agente

**Estado al 21 de noviembre de 2026**

Investigación en curso. Stellar documenta el soporte para verificar ML-DSA y se comprobó el Protocolo 30 en Testnet. Quedan pendientes la subcuenta experimental, el firmante, la transferencia y las mediciones de TilcAI.

## Qué aprendimos

| Hallazgo | Consecuencia para TilcAI |
| --- | --- |
| ML-DSA es una firma estandarizada por NIST. CAP-87 añade verificación de las variantes 44, 65 y 87 dentro de Soroban. | Probar la firma de autorización de gasto en el contrato. ML-KEM establece claves para cifrado y queda fuera de la prueba. [FIPS 204](https://csrc.nist.gov/pubs/fips/204/final) · [FIPS 203](https://csrc.nist.gov/pubs/fips/203/final) · [CAP-87](https://github.com/stellar/stellar-protocol/blob/master/core/cap-0087.md) |
| ML-DSA-44 usa una clave pública de 1.312 bytes y una firma de 2.420. Ed25519 usa 32 y 64 bytes respectivamente. | Medir bytes del XDR, recursos, comisión y latencia con una operación equivalente. Registrar la clave pública una vez separa el costo de registro del costo por gasto. [CAP-87](https://github.com/stellar/stellar-protocol/blob/master/core/cap-0087.md) |
| Testnet reportó Protocolo 30. El voto de mainnet estaba previsto para el 23 de noviembre. Los firmantes poscuánticos nativos para cuentas clásicas pertenecen a la hoja de ruta de Stellar. | Fijar red y versiones en cada prueba. La envoltura de la transacción se firma con Ed25519. El consenso, la cuenta clásica y la passkey administrativa tienen una evaluación independiente. [Horizon Testnet](https://horizon-testnet.stellar.org/) · [Bell](https://stellar.org/blog/developers/introducing-bell-protocol-30-on-stellar) · [Plan de Stellar](https://stellar.org/blog/foundation-news/introducing-the-quantum-preparedness-plan) |
| Soundness Labs publicó una transferencia en Testnet con Falcon-512 de ronda 3. Ethereum y Bitcoin documentan sus propias rutas. | El precedente en Stellar muestra una cuenta contractual experimental. TilcAI probará ML-DSA nativo en el presupuesto de una sesión y asociará la evidencia al recibo. [Soundness Labs](https://github.com/SoundnessLabs/stellar-pq) · [Ruta de Ethereum](https://ethereum.org/roadmap/security/quantum-resistance/) · [BIP-360](https://github.com/bitcoin/bips/blob/master/bip-0360.mediawiki) |

## Orden de pago y capas de firma

~~~mermaid
flowchart TD
    Order["Orden de pago<br/>Importe, activo y destinatario"]
    Order --> G["Wallet Stellar clásica G…"]
    G --> E["La clave Ed25519 firma la transacción"]
    E --> Net["Stellar verifica la firma y confirma el pago"]

    Order --> C["TilcAI · tarjeta experimental en Stellar Testnet"]
    C --> S["El firmante aislado firma la autorización Soroban con ML-DSA"]
    S --> R["El relayer firma con Ed25519 y envía la transacción"]
    R --> V["La subcuenta C… verifica la firma con CAP-87<br/>y comprueba el límite, el destino y la vigencia"]
    V --> P["Stellar confirma el pago de prueba"]
    P --> Receipt["El recibo vincula permiso, orden, pago y evidencia de entrega"]
~~~

La demo de producto usa una subcuenta Soroban, pago directo y autorización clásica. El esquema compara una cuenta Stellar clásica `G…` con la tarjeta experimental `C…`. En la tarjeta experimental, el contrato usa `__check_auth` para verificar la firma y aplicar la política. El firmante firma el payload de Soroban ligado a red, invocación, nonce y vencimiento. La API concilia la orden por su ID y el hash. Para acreditar unicidad de la orden en cadena, incluir su identificador en la invocación firmada y comprobar su consumo en el contrato. La idempotencia de la API tiene su propia prueba. [Autorización en Soroban](https://developers.stellar.org/docs/learn/fundamentals/contract-development/authorization)

## Tarea delegable

> **Prototipo ML-DSA-44 en Soroban.** Una subcuenta experimental, un firmante aislado y una compra de **0,50 USDC de prueba** dentro del límite. Comparar con la misma transferencia usando autorización clásica en Soroban. Iniciar con el entorno de P0.0 en paralelo con P0.1A e integrar la evidencia en el recibo tras P0.2. [Dependencias](../roadmap.md)

### Cambios propuestos por módulo

| Módulo | Responsabilidad propuesta |
| --- | --- |
| [Contratos Soroban](../../contracts/soroban/README.md) | Preparar un entorno de prueba con SDK y CLI compatibles con Protocolo 30. El repo fija Soroban SDK `29.0.1` para su base. Registrar la clave pública experimental y usar CAP-87 en `__check_auth`. Verificar el protocolo del nodo y la simulación con la herramienta elegida. [Guía de Bell](https://stellar.org/blog/developers/bell-protocol-30-upgrade-guide) · [SDK de Soroban](https://github.com/stellar/rs-soroban-sdk/releases) |
| [Adaptador TilcAI](../../packages/tilcai-adapter/README.md) y firmante aislado | Versionar algoritmo, clave pública y formato de autorización. El firmante aislado genera y usa la clave privada dentro de su frontera de custodia. El agente pide el pago mediante scopes. El relayer patrocina y envía con su propia clave. |
| API, worker y recibo | Reutilizar orden, intento, hash y entrega. Registrar red, protocolo, algoritmo, versión de política y evidencia de la subcuenta. Mostrar «Autorización ML-DSA verificada · Testnet» cuando la transacción confirmada acredite que se ejecutó la regla ML-DSA obligatoria. El proveedor aporta evidencia de entrega. |
| Web móvil y MCP | El primer prototipo puede ejecutarse desde un cliente de prueba. Web móvil y MCP pueden mostrar el estado experimental y consultar el mismo recibo tras integrar evidencia y API. Los canales usan el flujo común de permisos. |

### Criterios de salida

- [ ] Registrar red, protocolo observado, versiones, dirección de contrato, activo y versión de política.
- [ ] Pasar un vector conocido de FIPS 204 y comprobar compatibilidad del firmante con el contrato.
- [ ] Confirmar un pago de 0,50 en Testnet y guardar hash, ledger, evidencia de autorización y recibo.
- [ ] Mostrar rechazos en Soroban por firma inválida, autorización repetida o vencida y gasto fuera de límite o con otro destino. Probar aparte la idempotencia de la orden en la API.
- [ ] Comparar bytes de autorización y transacción, recursos, comisión y latencia con una operación equivalente de firma clásica en Soroban. Usar el mismo activo, monto y política.

### Paso a producción

Probar rotación, revocación, recuperación y retiro. Identificar quién puede cambiar el firmante, la política o el beneficiario. Si una acción usa un esquema híbrido, exigir **ambas firmas sobre la misma autorización** y comprobar que una credencial clásica por sí sola no pueda autorizarla ni reemplazar la regla. Cerrar custodia, recuperación y auditoría según el alcance publicado antes de pilotar con fondos reales.

El pitch puede anunciar **«Investigación en curso sobre autorización poscuántica en tarjetas de agente»**. Con evidencia completa, usar **«Una tarjeta de prueba verificó un gasto con ML-DSA en Soroban, Stellar Testnet»**.

[Prioridades](../roadmap.md) · [Arquitectura](../architecture.md) · [Demo de producto](../demo.md) · [README](../../README.md)
