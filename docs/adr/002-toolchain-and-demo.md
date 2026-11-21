# ADR 002 · Herramientas y riel de demo

**Estado** Aceptado para la base.

Usar pnpm para TypeScript y Cargo para Soroban. Mantener Node 24 LTS por compatibilidad con la infraestructura de TilcAI. Seleccionar React 19.3.0 y TypeScript 6 a partir de Expo SDK 58. Cada superficie conserva su herramienta de compilación.

La demo liquida por transferencia directa en Soroban. x402 y MPP requieren pruebas por versión de cuenta, política, SDK, red, activo y proveedor antes de activarse. Mantener un único intento comprometido por orden mientras haya un resultado incierto. [Detalle del stack y las fuentes](../stack.md)
