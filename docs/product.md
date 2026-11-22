# TilcAI Wallet

TilcAI Wallet hace verificables las compras de agentes de IA con una tarjeta fondeada por sesión, controles desde el celular y recibos que enlazan permiso, orden, pago y entrega.

El cliente inicial son agencias de automatización con IA en La Paz, Bolivia, que compran datos e informes para proyectos de clientes. El piloto explora también freelancers que operan agentes para clientes. La hipótesis comercial es una suscripción mensual por agencia, con precio por validar.

## Primera demostración

En Stellar testnet, la tarjeta de Codex · Portátil recibe 25 USDC de prueba. Compra un informe por 0,50 bajo un tope inicial de 0,50 y queda con 24,50 de saldo y cero capacidad de gasto. Pide un aumento de 0,50. El dueño aprueba con passkey. Cuando Stellar confirma el nuevo límite de 1,00, el agente revalida su segunda orden. Después del segundo pago quedan 24,00. Se prueban congelación, revocación y devolución.

Las aplicaciones representan superficies del mismo producto. La primera entrega integrada recorre web móvil y MCP. Cada canal valida su identidad y el alcance de sus operaciones antes de activarse.

El recibo atribuye la liquidación a Stellar y la evidencia de entrega al proveedor. Si TilcAI guarda el informe comprado, lo sirve desde almacenamiento privado tras verificar el acceso a la orden. [Validación](validation.md) · [Almacenamiento](persistence.md)

La hoja de ruta incluye una tarjeta experimental que verifica autorización de gasto con ML-DSA en Stellar Testnet. La investigación está en curso. El recibo mostrará esta evidencia cuando pueda conciliarse con un pago confirmado y la regla de la subcuenta. [Investigación y alcance](research/post-quantum.md) · [Prioridades](roadmap.md)
