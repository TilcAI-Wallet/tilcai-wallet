# Demo en Stellar testnet

[Contrato de API, fixtures y arranque local](demo-api.md)

- [ ] Desplegar una subcuenta de prueba con autoridad recuperable del dueño.
- [ ] Crear la tarjeta Codex · Portátil, fondear 20 USDC de prueba y confirmar el tope inicial de 0,50.
- [ ] Pagar un informe de 0,50 por Soroban directo y abrir el mismo recibo desde web móvil y MCP.
- [ ] Comprobar saldo de 19,50 y disponible para agente de 0,00. Repetir la misma orden y verificar que no hay otro cargo.
- [ ] Bloquear el segundo pedido por tope, registrar la solicitud de +0,50 y mostrar la aprobación con passkey.
- [ ] Confirmar el tope acumulado de 1,00. Revalidar el pedido y pagar 0,50. Verificar saldo de 19,00 y recibo.
- [ ] Congelar, distinguir el estado pendiente de la confirmación y comprobar el rechazo de un nuevo gasto.
- [ ] Revocar, conciliar lo que quede en vuelo y devolver 19,00 a la cuenta principal con aprobación del dueño.

El recibo guarda permiso, orden, pago y evidencia del proveedor. Vector52 es candidato. Si la integración no está lista, un proveedor de prueba identificado puede verificar el hash y registrar la entrega. Registrar red, activo, protocolo, versiones y hashes. El ejemplo supone patrocinio de comisiones en otro activo.

El corte necesita **Postgres coordinando el estado de la orden** entre API y worker. Probar reinicio con intento pendiente, repetición de la orden, rechazo directo de una compra fuera de política y recepción duplicada de evidencia. El recibo distingue pago, entrega y reembolso. [Validación](validation.md) · [Persistencia](persistence.md)

## Prueba poscuántica opcional

**Investigación en curso.** Después de disponer de una transferencia clásica comparable en Soroban, mostrar una subcuenta de prueba que verifica ML-DSA para un gasto de **0,50 USDC de prueba**. Presentar hash, rechazos y mediciones cuando estén verificados. El recorrido principal de web móvil y MCP se puede cerrar con autorización clásica. [Tarea, criterios y frase para el pitch](research/post-quantum.md#tarea-delegable) · [Prioridades](roadmap.md)
