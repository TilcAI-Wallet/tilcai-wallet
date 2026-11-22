# Pruebas transversales

Las pruebas validan el arranque MCP con la revisión 2025-11-25. Sin credencial el servidor carece de herramientas de gasto. Con una API HTTP de prueba se verifican la tarjeta, la orden, su repetición con la misma clave, el rechazo por límite y el recibo. El servicio API base prueba su contrato de salud. La conciliación real y el aislamiento entre tenants se prueban con el backend integrado.

Pendientes: duplicados, eventos fuera de orden, dos sesiones aisladas, una renovación sin perder el contador, devolución con pagos en vuelo y conciliación de entrega.

El primer corte exige pruebas de concurrencia e aislamiento de dos tenants con Postgres, reinicio del worker antes y después del envío y rechazos directos de la política en Soroban. [Matriz de pruebas](../docs/validation.md)
