# Entornos

- **Local.** La API y WhatsApp comprueban salud en loopback. Web, Mini App y Expo arrancan por separado. Los procesos toman variables del entorno. `.env.example` enumera valores de desarrollo.
- **Testnet.** Las direcciones, activos, claves de servicio y políticas se fijarán al integrar. El despliegue de testnet y sus pruebas requieren credenciales dedicadas.
- **Producción.** Requiere definir aislamiento del firmante, rotación, persistencia, observabilidad y recuperación. Las aplicaciones solo reciben metadatos y configuración pública.

## Pendientes

- [ ] Configurar runners de integración y destinos de testnet.
- [ ] Definir límites, alertas, copias de seguridad y recuperación.
- [ ] Documentar rotación del firmante, permisos por entorno y revocación del proveedor de canal.
