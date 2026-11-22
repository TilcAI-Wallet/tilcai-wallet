# Contratos de API

`purchase-provisional` es una propuesta estricta aislada para #6, pendiente de
conciliación con #4. No describe endpoints disponibles. Los importes son cadenas
enteras de unidades atómicas, nunca números de punto flotante. El campo de evidencia
`stellar_testnet` solo se debe usar tras verificar el hash y ledger en esa red;
los datos sintéticos no son recibos de Testnet. `confirmedBalanceAtomic` y su ledger
no deben rellenarse con una proyección. Antes de conectar PWA o MCP, Omar y backend
deben acordar estos nombres, el alcance de autenticación y las rutas definitivas.
