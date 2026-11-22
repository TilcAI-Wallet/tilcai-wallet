# Contribuir a TilcAI Wallet

1. Lee las [prioridades](docs/roadmap.md), los issues abiertos y el alcance del módulo.
2. Crea una rama a partir de `main`. Coordina cambios de contratos y rutas antes del primer consumidor.
3. Instala desde la raíz con `pnpm install --frozen-lockfile`. Trabaja con `pnpm --filter @tilcai-wallet/<módulo> …`.
4. Ejecuta lint, typecheck y las pruebas aplicables. Añade pruebas para nuevas garantías de gasto y para caminos de error.
5. Abre un PR que describa qué se puede probar y los pendientes que expone.

Los canales consumen la API y el SDK. Ningún cliente debe importar firmantes, acceso a datos privado ni credenciales de servicio. Las pruebas de integración iniciales usan testnet y valores de prueba. Usa archivos de ejemplo sin secretos.
