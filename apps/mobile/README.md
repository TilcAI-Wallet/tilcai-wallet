# App móvil

La base usa Expo SDK 58, React Native 0.88.1 y Expo Router. Las rutas viven en `src/app`.

- `pnpm --filter @tilcai-wallet/mobile dev` inicia Metro.
- `pnpm --filter @tilcai-wallet/mobile web` inicia la vista web de Expo.
- `pnpm --filter @tilcai-wallet/mobile build` exporta la vista web.
- `pnpm --filter @tilcai-wallet/mobile exec expo install <paquete>` resuelve versiones compatibles de módulos nativos.

- [ ] Definir identificadores de iOS y Android para el proyecto y entornos.
- [ ] Probar development builds, navegación de vuelta desde canales y passkeys en dispositivos.
- [ ] Implementar sesión, tarjetas, firma de aprobaciones y avisos.
- [ ] Verificar Universal Links y Android App Links antes de distribuir.

La exportación web es un smoke del módulo móvil. Next.js es el panel web del producto. [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/)
