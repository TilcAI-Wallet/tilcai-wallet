# Entornos

- **Local.** La API y WhatsApp comprueban salud en loopback. Web, Mini App y Expo arrancan por separado. Los procesos toman variables del entorno. `.env.example` enumera valores de desarrollo.
- **Testnet.** Usar Supabase Postgres con esquema privado y conexiones separadas para API y worker. Registrar versiones, direcciones, activo, pagador de comisiones y contrato. Mantener evidencias y credenciales dedicadas en sus ámbitos. [ADR 003](../docs/adr/003-supabase-persistence.md)
- **Producción.** Requiere definir aislamiento del firmante, rotación, persistencia, observabilidad y recuperación. Las aplicaciones solo reciben metadatos y configuración pública.

## Pendientes

- [ ] Configurar runners de integración y destinos de testnet.
- [ ] Preparar migraciones reproducibles, roles mínimos, RLS, variables de pool y bucket privado.
- [ ] Definir límites, alertas, copias de seguridad y recuperación.
- [ ] Probar restauración de Postgres y de objetos privados por separado.
- [ ] Documentar rotación del firmante, permisos por entorno y revocación del proveedor de canal.
