# ADR 001 · Canales propios

**Estado** Aceptado para la base.

Mantener un servidor MCP y un bot de Telegram de TilcAI Wallet en el monorepo. Ambos comparten API y SDK. Stdio y el futuro Streamable HTTP se integran con el mismo dominio y no firman pagos localmente. El bot y la Mini App son aplicaciones separadas porque tienen ciclos de ejecución distintos.

Reutilizar capacidades compatibles de la infraestructura de TilcAI detrás del adaptador. Verificar las versiones y permisos antes de incorporar dependencias upstream.
